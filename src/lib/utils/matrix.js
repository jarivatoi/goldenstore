/*!
 * Matrix2D 3.13.0
 * https://gsap.com
 *
 * @license Copyright 2008-2025, GreenSock. All rights reserved.
 * Subject to the terms at https://gsap.com/standard-license
 * @author: Jack Doyle, jack@greensock.com
 */

let _doc,
	_win,
	_docElement,
	_body,
	_divContainer,
	_svgContainer,
	_identityMatrix,
	_gEl,
	_transformProp = "transform",
	_transformOriginProp = "transformOrigin",
	_hasOffsetBug,
	_setDoc = element => {
		let doc = element.ownerDocument || element;
		if (!(_transformProp in element.style) && "msTransform" in element.style) {
			_transformProp = "msTransform";
			_transformOriginProp = "msTransformOrigin";
		}
		while (doc.parentNode && (doc = doc.parentNode)) {	}
		_win = window;
		_identityMatrix = new Matrix2D();
		if (doc) {
			_doc = doc;
			_docElement = doc.documentElement;
			_body = doc.body;
			_gEl = _doc.createElementNS("http://www.w3.org/2000/svg", "g");
			_gEl.style.transform = "none";
			let d1 = doc.createElement("div"),
				d2 = doc.createElement("div"),
				root = doc && (doc.body || doc.firstElementChild);
			if (root && root.appendChild) {
				root.appendChild(d1);
				d1.appendChild(d2);
				d1.setAttribute("style", "position:static;transform:translate3d(0,0,1px)");
				_hasOffsetBug = (d2.offsetParent !== d1);
				root.removeChild(d1);
			}
		}
		return doc;
	},
	_forceNonZeroScale = e => { //walks up the element's ancestors and finds any that have 0 scale and temporarily changes them to 0.0001 so that we can get proper measurements
		let a, cache, i, j, elements, m, s;
		while (e && e !== _body) {
			cache = e._gsap;
			cache && cache.uncache && cache.get(e, "x"); // force re-parsing in case it was done in a different unit
			if (cache && !cache.scaleX && !cache.scaleY && cache.renderTransform && !cache.uncache) {
				cache.scaleX = cache.scaleY = 1e-4;
				cache.renderTransform(1, cache);
				if (i) {
					elements.push(cache);
				} else {
					elements = [cache];
				}
			}
			e = e.parentNode;
		}
		return elements;
	},

	//finds the offsetParent of an element (or null if none exists)
	_getOffsetParent = element => {
		let offsetParent = element.offsetParent,
			doc = element.ownerDocument;
		while (offsetParent && offsetParent.nodeName.toLowerCase() !== "body" && offsetParent.nodeName.toLowerCase() !== "html") {
			if (offsetParent.style && _win.getComputedStyle(offsetParent).position === "static") {
				offsetParent = offsetParent.offsetParent;
			} else {
				break;
			}
		}
		return offsetParent || (doc ? (doc.body || doc.documentElement) : _body);
	},

	//gets the cumulative transforms applied to an element, going up the ancestor chain and factoring in any CSS transforms, scroll offsets, etc. Some browsers don't accurately report getBoundingClientRect() when there are CSS transforms applied, so this works around those issues. We purposefully EXCLUDE the transforms applied to the element itself.
	_getTotalTransform = (element, inverse) => {
		if (!element || !element.parentNode || (_doc || _setDoc(element)).documentElement === element) {
			return new Matrix2D();
		}
		let zeroScales = _forceNonZeroScale(element.parentNode),
			svg = element.ownerSVGElement,
			temps = [],
			container = svg ? _svgContainer : _divContainer,
			b1, b2, b3, matrix, i;
		if (container) {
			b1 = container.getBoundingClientRect();
			container.appendChild(element);
			b2 = element.getBoundingClientRect();
			container.removeChild(element);
			if (element.parentNode) {
				element.parentNode.appendChild(element);
			}
			matrix = new Matrix2D((b2.left - b1.left) / 100, 0, 0, (b2.top - b1.top) / 100, b2.left - b1.left, b2.top - b1.top);
		} else {
			if (element.getBBox) {
				b1 = element.getBBox();
				matrix = element.transform ? element.transform.baseVal : {}; // IE doesn't follow the spec.
				if (matrix.numberOfItems) {
					matrix = matrix.numberOfItems > 1 ? _consolidate(matrix) : matrix.getItem(0).matrix;
					matrix = new Matrix2D(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
				} else {
					matrix = _identityMatrix;
				}
				if (b1.x || b1.y) {
					matrix = matrix.translate(b1.x, b1.y);
				}
			} else {
				matrix = _identityMatrix;
			}
		}
		if (zeroScales) {
			i = zeroScales.length;
			while (--i > -1) {
				zeroScales[i].scaleX = zeroScales[i].scaleY = 0;
				zeroScales[i].renderTransform(1, zeroScales[i]);
			}
		}
		return inverse ? matrix.inverse() : matrix;
	},

	//consolidates all the transform matrices in a list into a single Matrix2D.
	_consolidate = transforms => {
		let matrix = new Matrix2D(),
			i = 0;
		for (; i < transforms.numberOfItems; i++) {
			matrix.multiply(transforms.getItem(i).matrix);
		}
		return matrix;
	};

export class Matrix2D {
	constructor(a, b, c, d, e, f) {
		if (a == null) {
			a = 1;
		}
		if (b == null) {
			b = 0;
		}
		if (c == null) {
			c = 0;
		}
		if (d == null) {
			d = 1;
		}
		if (e == null) {
			e = 0;
		}
		if (f == null) {
			f = 0;
		}
		this.a = a;
		this.b = b;
		this.c = c;
		this.d = d;
		this.e = e;
		this.f = f;
	}

	inverse() {
		let {a, b, c, d, e, f} = this,
			determinant = (a * d - b * c) || 1e-10;
		return new Matrix2D((d / determinant), (-b / determinant), (-c / determinant), (a / determinant), ((c * f - d * e) / determinant), ((b * e - a * f) / determinant));
	}

	multiply(matrix) {
		let {a, b, c, d, e, f} = this,
			a2 = matrix.a,
			b2 = matrix.c,
			c2 = matrix.b,
			d2 = matrix.d,
			e2 = matrix.e,
			f2 = matrix.f;
		return new Matrix2D((a * a2 + b * c2), (a * d2 + b * d2), (c * a2 + d * c2), (c * d2 + d * d2), (e * a2 + f * c2 + e2), (e * d2 + f * d2 + f2));
	}

	clone() {
		return new Matrix2D(this.a, this.b, this.c, this.d, this.e, this.f);
	}

	equals(matrix) {
		let {a, b, c, d, e, f} = this;
		return (a === matrix.a && b === matrix.b && c === matrix.c && d === matrix.d && e === matrix.e && f === matrix.f);
	}

	apply(point, decoratee) {
		if (!decoratee) {
			decoratee = {};
		}
		let {x, y} = point,
			{a, b, c, d, e, f} = this;
		decoratee.x = x * a + y * c + e || 0;
		decoratee.y = x * b + y * d + f || 0;
		return decoratee;
	}

}

//feed in an element and it'll return a 2D matrix (optionally inverted) so that you can translate between coordinate spaces.
// Inverting lets you translate FROM the element's local coordinates TO the global space.
// Not inverting lets you go FROM global coordinates TO the element's local space.
// We needed this to work around various browser bugs, like Firefox doesn't accurately report getBoundingClientRect() when there are CSS transforms.
export const getGlobalMatrix = (element, inverse, adjustGOffset, includeScrollInFixed) => {
	if (!element || !element.parentNode || (_doc || _setDoc(element)).documentElement === element) {
		return new Matrix2D();
	}
	let zeroScales = _forceNonZeroScale(element),
		svg = element.ownerSVGElement,
		temps = [],
		container = svg ? _svgContainer : _divContainer,
		b1, b2, b3, matrix, i;
	if (container) {
		b1 = container.getBoundingClientRect();
		container.appendChild(element);
		b2 = element.getBoundingClientRect();
		container.removeChild(element);
		if (element.parentNode) {
			element.parentNode.appendChild(element);
		}
		matrix = new Matrix2D((b2.left - b1.left) / 100, 0, 0, (b2.top - b1.top) / 100, b2.left - b1.left, b2.top - b1.top);
	} else {
		if (element.getBBox) {
			b1 = element.getBBox();
			matrix = element.transform ? element.transform.baseVal : {}; // IE doesn't follow the spec.
			if (matrix.numberOfItems) {
				matrix = matrix.numberOfItems > 1 ? _consolidate(matrix) : matrix.getItem(0).matrix;
				matrix = new Matrix2D(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
			} else {
				matrix = _identityMatrix;
			}
			if (b1.x || b1.y) {
				matrix = matrix.translate(b1.x, b1.y);
			}
		} else {
			matrix = _identityMatrix;
		}
	}
	if (zeroScales) {
		i = zeroScales.length;
		while (--i > -1) {
			zeroScales[i].scaleX = zeroScales[i].scaleY = 0;
			zeroScales[i].renderTransform(1, zeroScales[i]);
		}
	}
	return inverse ? matrix.inverse() : matrix;
};