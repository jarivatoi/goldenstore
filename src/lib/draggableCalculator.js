/*!
 * Draggable Calculator 3.13.0 (Modified for Mini Calculator)
 * https://gsap.com
 *
 * @license Copyright 2008-2025, GreenSock. All rights reserved.
 * Subject to the terms at https://gsap.com/standard-license
 * @author: Jack Doyle, jack@greensock.com
 * 
 * Modified for Mini Calculator: Removed bounds snapping, added momentum/inertia
 */

import { gsap } from "gsap";

let _docElement = document.documentElement,
    _body,
    _tempDiv,
    _coreInitted,
    _checkPrefix = function(property, element) {
        let result = element.style[property];
        if (result) {
            return result;
        }
        let prefixes = ["O", "Moz", "ms", "Ms", "Webkit"],
            i = 5,
            capProperty = property.charAt(0).toUpperCase() + property.substr(1);
        while (--i > -1 && !result) {
            result = element.style[prefixes[i] + capProperty];
        }
        return result;
    },
    _supports3D,
    _dragCount = 0,
    _clickableTagExp = /^(?:a|input|textarea|button|select)$/i,
    _lastDragTime = 0,
    _temp1 = {},
    _windowProxy = {},
    _isTouchDevice = (function() {
        try {
            return (window.navigator.maxTouchPoints > 0) || ("ontouchstart" in window);
        } catch (e) {
            return false;
        }
    })(),
    _touchEventLookup = {
        "mousedown": "touchstart",
        "mouseup": "touchend",
        "mousemove": "touchmove"
    },
    _supportsPassive,
    _matrix,
    _point1 = {x:0, y:0},
    _point2 = {x:0, y:0},
    _round = function(value) {
        return Math.round(value * 1000000) / 1000000 || 0;
    },
    _isArrayLike = function(value) {
        return value && typeof(value) === "object" && value.push && value.length !== undefined;
    },
    _slice = function(a, start, end) {
        return a.slice ? a.slice(start, end) : Array.prototype.slice.call(a, start, end);
    },
    _copy = function(obj, deep) {
        let copy = {},
            p;
        for (p in obj) {
            copy[p] = (deep && typeof(obj[p]) === "object" && obj[p] && obj[p].nodeType !== 1) ? _copy(obj[p], deep) : obj[p];
        }
        return copy;
    },
    _extend = function(obj, defaults) {
        let p;
        for (p in defaults) {
            if (!(p in obj)) {
                obj[p] = defaults[p];
            }
        }
        return obj;
    },
    _getGSAP = () => {
        let _gsap = gsap || (typeof(window) !== "undefined" && window.gsap);
        return _gsap && _gsap.registerPlugin && _gsap;
    },
    _isFunction = value => typeof(value) === "function",
    _isObject = value => typeof(value) === "object",
    _isUndefined = value => typeof(value) === "undefined",
    _emptyFunc = () => false,
    _transformProp = "transform",
    _transformOriginProp = "transformOrigin",
    _DEG2RAD = Math.PI / 180,
    _RAD2DEG = 180 / Math.PI,
    _bigNum = 1e20,
    _identityMatrix,
    _getTime = Date.now || function() { return new Date().getTime(); },
    _renderQueue = [],
    _lookup = {},
    _lookupCount = 0,
    _clickableTest = function(e) {
        return (e.target.style.touchAction !== "none" && !e.target.style.touchAction) || _clickableTagExp.test(e.target.nodeName + "");
    },
    _setTouchActionForAllDescendants = function(elements, value) {
        let i = elements.length;
        while (--i > -1) {
            elements[i].style.touchAction = value;
        }
    },
    _isFixed = function(element) {
        return (_win.getComputedStyle(element).position === "fixed");
    },
    _getDocScrollTop = function() {
        return _docElement.scrollTop || _body.scrollTop || 0;
    },
    _getDocScrollLeft = function() {
        return _docElement.scrollLeft || _body.scrollLeft || 0;
    },
    _addListener = function(element, type, func, capture) {
        if (element.addEventListener) {
            let touchType = _touchEventLookup[type];
            capture = capture || (_supportsPassive ? {passive: false, capture: true} : true);
            element.addEventListener(touchType || type, func, capture);
            if (touchType && type !== touchType) {
                element.addEventListener(type, func, capture);
            }
        } else if (element.attachEvent) {
            element.attachEvent("on" + type, func);
        }
    },
    _removeListener = function(element, type, func, capture) {
        if (element.removeEventListener) {
            let touchType = _touchEventLookup[type];
            element.removeEventListener(touchType || type, func, capture);
            if (touchType && type !== touchType) {
                element.removeEventListener(type, func, capture);
            }
        } else if (element.detachEvent) {
            element.detachEvent("on" + type, func);
        }
    },
    _preventDefault = function(e) {
        e.preventDefault && e.preventDefault();
        e.stopPropagation && e.stopPropagation();
        if (e.preventManipulation) {
            e.preventManipulation();
        }
    },
    _hasTouchID = function(list, ID) {
        let i = list.length;
        while (--i > -1) {
            if (list[i].identifier === ID) {
                return true;
            }
        }
    },
    _onMultiTouchDocumentEnd = function(e) {
        _isMultiTouching = (_multiTouchID1 && _hasTouchID(e.changedTouches, _multiTouchID1)) && (_multiTouchID2 && _hasTouchID(e.changedTouches, _multiTouchID2));
        let i = _dragInstances.length;
        while (--i > -1) {
            _dragInstances[i]._onDocTouchEnd(e);
        }
    },
    _onMultiTouchDocument = function(e) {
        _isMultiTouching = (_multiTouchID1 && _hasTouchID(e.touches, _multiTouchID1)) && (_multiTouchID2 && _hasTouchID(e.touches, _multiTouchID2));
        let i = _dragInstances.length;
        while (--i > -1) {
            _dragInstances[i]._onDocTouchMove(e);
        }
    },
    _getDocumentFromElement = element => element.ownerDocument || _doc,
    _ctx,
    _globalEventTarget = {},
    _win,
    _doc,
    _docIsReady,
    _dragInstances = [],
    _lastPointerEventTimeout,
    _synthetic = {},
    _throttledCall = function(func, wait) {
        let timeout, args, context;
        return function() {
            context = this;
            args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    },
    _initCore = function(required) {
        _coreInitted = 1;
        _body = _body || _doc.body || _docElement;
        if (_body) {
            _tempDiv = _doc.createElement("div");
            _supports3D = !!_checkPrefix("perspective", _tempDiv);
        }
        return _supports3D;
    },
    _placeholderDiv = _doc ? _doc.createElement("div") : {},
    _setDefaults = function(obj, defaults) {
        for (let p in defaults) {
            if (!(p in obj)) {
                obj[p] = defaults[p];
            }
        }
        return obj;
    },
    _addToRenderQueue = function(func) {
        if (_renderQueue.indexOf(func) === -1) {
            _renderQueue.push(func);
        }
    },
    _renderQueueTick = function() {
        let i = _renderQueue.length;
        while (--i > -1) {
            _renderQueue[i]();
        }
    },
    _addGlobalListener = function(type, func) {
        if (!_globalEventTarget[type]) {
            _addListener(_doc, type, _renderQueueTick);
            _globalEventTarget[type] = true;
        }
        _addListener(_doc, type, func);
    },
    _removeGlobalListener = function(type, func) {
        _removeListener(_doc, type, func);
    },
    _getElementBounds = function(element, withoutTransforms) {
        element = element[0] || element;
        let bounds = element.getBoundingClientRect(),
            scroll = _getDocScrollTop(),
            scrollLeft = _getDocScrollLeft(),
            doc = _getDocumentFromElement(element),
            docElement = doc.documentElement,
            matrix = withoutTransforms ? _identityMatrix : _getTotalTransform(element),
            x = bounds.left + scrollLeft - docElement.clientLeft,
            y = bounds.top + scroll - docElement.clientTop,
            e;
        if (withoutTransforms) {
            bounds = element.getBoundingClientRect();
            e = matrix.apply({x: bounds.left, y: bounds.top});
            x = e.x;
            y = e.y;
        }
        return {left: x, top: y, width: bounds.width, height: bounds.height};
    };

// Initialize when DOM is ready
if (typeof document !== "undefined") {
    _doc = document;
    _docElement = _doc.documentElement;
    _body = _doc.body;
    _win = window;
    _initCore();
}

export class DraggableCalculator {
    constructor(target, vars) {
        this.target = target;
        this.vars = vars || {};
        this.data = this.vars.data || {};
        this.x = 0;
        this.y = 0;
        this.isDragging = false;
        this.isPressed = false;
        this.startX = 0;
        this.startY = 0;
        this.deltaX = 0;
        this.deltaY = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.lastX = 0;
        this.lastY = 0;
        this.lastTime = 0;
        
        // Inertia settings for momentum
        this.inertia = this.vars.inertia !== false;
        this.throwResistance = this.vars.throwResistance || 50; // Much lower resistance = more momentum
        this.maxDuration = this.vars.maxDuration || 4; // Longer momentum duration
        this.minDuration = this.vars.minDuration || 0.5; // Minimum momentum time
        
        // No bounds - free movement
        this.bounds = null;
        
        this._eventTarget = this.vars.trigger ? this.target.querySelector(this.vars.trigger) : this.target;
        
        this.init();
    }
    
    init() {
        if (!this._eventTarget) return;
        
        this._eventTarget.style.cursor = "grab";
        
        // Add event listeners
        this._onPress = this._onPress.bind(this);
        this._onDrag = this._onDrag.bind(this);
        this._onRelease = this._onRelease.bind(this);
        
        _addListener(this._eventTarget, "mousedown", this._onPress);
        _addListener(this._eventTarget, "touchstart", this._onPress);
    }
    
    _onPress(e) {
        // Prevent event from affecting background elements
        e.preventDefault();
        e.stopPropagation();
        
        if (e.type === "touchstart") {
            this.pointerEvent = e.touches[0];
        } else {
            this.pointerEvent = e;
        }
        
        this.isPressed = true;
        this.startX = this.pointerEvent.pageX;
        this.startY = this.pointerEvent.pageY;
        this.lastX = this.startX;
        this.lastY = this.startY;
        this.lastTime = _getTime();
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Get current position
        let currentTransform = gsap.getProperty(this.target, "transform");
        let matrix = new DOMMatrix(currentTransform);
        this.x = matrix.m41 || 0;
        this.y = matrix.m42 || 0;
        
        this._eventTarget.style.cursor = "grabbing";
        
        // Add global listeners
        _addListener(_doc, "mousemove", this._onDrag);
        _addListener(_doc, "mouseup", this._onRelease);
        _addListener(_doc, "touchmove", this._onDrag);
        _addListener(_doc, "touchend", this._onRelease);
        _addListener(_doc, "touchcancel", this._onRelease);
        
        // Bring to front
        gsap.set(this.target, { zIndex: 10000 });
        
        if (this.vars.onDragStart) {
            this.vars.onDragStart.call(this, e);
        }
    }
    
    _onDrag(e) {
        if (!this.isPressed) return;
        
        // Prevent event from affecting background elements
        e.preventDefault();
        e.stopPropagation();
        
        if (e.type.indexOf("touch") !== -1) {
            this.pointerEvent = e.touches[0];
        } else {
            this.pointerEvent = e;
        }
        
        if (!this.pointerEvent) return;
        
        let currentX = this.pointerEvent.pageX;
        let currentY = this.pointerEvent.pageY;
        let currentTime = _getTime();
        
        this.deltaX = currentX - this.startX;
        this.deltaY = currentY - this.startY;
        
        // Calculate velocity for inertia
        let timeDelta = currentTime - this.lastTime;
        if (timeDelta > 0) {
            this.velocityX = (currentX - this.lastX) / timeDelta;
            this.velocityY = (currentY - this.lastY) / timeDelta;
        }
        
        this.lastX = currentX;
        this.lastY = currentY;
        this.lastTime = currentTime;
        
        // Calculate new position
        let newX = this.x + this.deltaX;
        let newY = this.y + this.deltaY;
        
        gsap.set(this.target, { x: newX, y: newY });
        
        if (!this.isDragging) {
            this.isDragging = true;
            if (this.vars.onDrag) {
                this.vars.onDrag.call(this, e);
            }
        }
        
        if (this.vars.onDrag) {
            this.vars.onDrag.call(this, e);
        }
    }
    
    _onRelease(e) {
        if (!this.isPressed) return;
        
        this.isPressed = false;
        let wasDragging = this.isDragging;
        this.isDragging = false;
        
        this._eventTarget.style.cursor = "grab";
        
        // Remove global listeners
        _removeListener(_doc, "mousemove", this._onDrag);
        _removeListener(_doc, "mouseup", this._onRelease);
        _removeListener(_doc, "touchmove", this._onDrag);
        _removeListener(_doc, "touchend", this._onRelease);
        _removeListener(_doc, "touchcancel", this._onRelease);
        
        // Update final position
        let currentTransform = gsap.getProperty(this.target, "transform");
        let matrix = new DOMMatrix(currentTransform);
        this.x = matrix.m41 || 0;
        this.y = matrix.m42 || 0;
        
        // Apply inertia/momentum if enabled and there's sufficient velocity
        if (this.inertia && wasDragging && (Math.abs(this.velocityX) > 0.1 || Math.abs(this.velocityY) > 0.1)) {
            this._applyInertia();
        } else {
            // Reset z-index after a delay
            setTimeout(() => {
                gsap.set(this.target, { zIndex: 9999 });
            }, 100);
        }
        
        if (this.vars.onDragEnd) {
            this.vars.onDragEnd.call(this, e);
        }
    }
    
    _applyInertia() {
        // Calculate throw distance based on velocity and resistance
        let velocityMultiplier = 600; // Reduced momentum distance for better control
        let throwX = (this.velocityX * velocityMultiplier) / this.throwResistance;
        let throwY = (this.velocityY * velocityMultiplier) / this.throwResistance;
        
        // Get calculator dimensions for boundary calculations
        const rect = this.target.getBoundingClientRect();
        const calcWidth = rect.width;
        const calcHeight = rect.height;
        
        // Define strict screen boundaries - calculator must stay completely inside
        const minX = 0; // Left boundary
        const maxX = window.innerWidth - calcWidth; // Right boundary
        const minY = 0; // Top boundary
        const maxY = window.innerHeight - calcHeight; // Bottom boundary
        
        // Calculate duration based on velocity
        let maxVelocity = Math.max(Math.abs(this.velocityX), Math.abs(this.velocityY));
        let duration = Math.max(this.minDuration, Math.min(this.maxDuration, maxVelocity / 8)); // Adjusted momentum duration
        
        // Final position after throw
        let finalX = this.x + throwX;
        let finalY = this.y + throwY;
        
        // Check if final position would be out of bounds
        let needsBounce = false;
        if (finalX < minX || finalX > maxX || finalY < minY || finalY > maxY) {
            needsBounce = true;
        }
        
        // Apply strict screen boundaries with bounce effect
        finalX = Math.max(minX, Math.min(maxX, finalX));
        finalY = Math.max(minY, Math.min(maxY, finalY));
        
        // Apply momentum animation with bounce effect if hitting boundaries
        gsap.to(this.target, {
            x: finalX,
            y: finalY,
            duration: duration,
            ease: needsBounce ? "bounce.out" : "power2.out", // Bounce effect when hitting boundaries
            onComplete: () => {
                // Reset z-index after animation
                gsap.set(this.target, { zIndex: 9999 });
                
                if (this.vars.onThrowComplete) {
                    this.vars.onThrowComplete.call(this);
                }
            }
        });
    }
    
    kill() {
        // Remove all event listeners
        _removeListener(this._eventTarget, "mousedown", this._onPress);
        _removeListener(this._eventTarget, "touchstart", this._onPress);
        _removeListener(_doc, "mousemove", this._onDrag);
        _removeListener(_doc, "mouseup", this._onRelease);
        _removeListener(_doc, "touchmove", this._onDrag);
        _removeListener(_doc, "touchend", this._onRelease);
        _removeListener(_doc, "touchcancel", this._onRelease);
        
        // Reset cursor
        if (this._eventTarget) {
            this._eventTarget.style.cursor = "";
        }
    }
    
    static create(targets, vars) {
        if (!_isArrayLike(targets)) {
            targets = [targets];
        }
        
        let instances = [];
        for (let i = 0; i < targets.length; i++) {
            instances.push(new DraggableCalculator(targets[i], vars));
        }
        
        return instances.length === 1 ? instances[0] : instances;
    }
}

// Initialize core when imported
if (typeof document !== "undefined") {
    _initCore();
}