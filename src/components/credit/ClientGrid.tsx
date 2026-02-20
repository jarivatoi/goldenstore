import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { Draggable, DraggableInstance } from '../../lib/draggable';
import { Search, X, Users, UserCheck, Mic, MicOff } from 'lucide-react';
import { Client } from '../../types';
import ClientCard from '../ClientCard';

// Register GSAP plugins
gsap.registerPlugin(Draggable, InertiaPlugin);

interface ClientGridProps {
  clients: Client[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showAllClients: boolean;
  onToggleAllClients: () => void;
  onClientLongPress: (client: Client) => void;
  onQuickAdd: (client: Client) => void;
  onResetCalculator: () => void;
  linkedClient: Client | null | undefined;
  recentTransactionClient: Client | null;
  onCloseWobble: () => void;
}

/**
 * CLIENT GRID COMPONENT
 * =====================
 * 
 * Displays client cards in a scrollable grid with search functionality
 */
const ClientGrid: React.FC<ClientGridProps> = ({
  clients,
  searchQuery,
  onSearchChange,
  showAllClients,
  onToggleAllClients,
  onClientLongPress,
  onQuickAdd,
  onResetCalculator,
  linkedClient,
  recentTransactionClient,
  onCloseWobble
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggableRef = useRef<DraggableInstance[] | null>(null);
  const dragStartXRef = useRef(0);
  const dragDirectionRef = useRef<'left' | 'right' | null>(null);

  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Convert spoken numbers to digits
  const convertSpokenToDigit = (input: string): string => {
    const numberMap: { [key: string]: string } = {
      'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
      'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
      'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
      'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
      'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
      'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
      'eighty': '80', 'ninety': '90', 'hundred': '100'
    };

    let result = input.toLowerCase();

    // Replace spoken numbers with digits
    Object.entries(numberMap).forEach(([word, digit]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      result = result.replace(regex, digit);
    });

    return result;
  };

  // Calculate Levenshtein distance between two strings
  const levenshteinDistance = (str1: string, str2: string): number => {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[len1][len2];
  };

  // Calculate similarity score (0 to 1, higher is better)
  const calculateSimilarity = (str1: string, str2: string): number => {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    const distance = levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return 1 - (distance / maxLength);
  };

  // Function to find best matching client from voice input
  const findBestClientMatch = (transcript: string): string | null => {
    // Convert spoken numbers to digits (e.g., "one" -> "1")
    const convertedInput = convertSpokenToDigit(transcript);
    const input = convertedInput.toLowerCase().trim();
    const inputNoSpaces = input.replace(/\s+/g, '');

    console.log('🎤 Voice search - Transcript:', transcript, '→ Processed:', input);

    // Log all client names that start with 'v' for debugging
    const vClients = clients.filter(c => c.name.toLowerCase().startsWith('v'));
    console.log('📋 Clients starting with V:', vClients.map(c => `"${c.name}"`).join(', '));

    // Skip very short inputs (less than 2 characters)
    if (input.length < 2) {
      console.log('❌ Input too short (<2 chars)');
      return null;
    }

    // Direct ID match (exact)
    const exactIdMatch = clients.find(c => c.id.toLowerCase() === input);
    if (exactIdMatch) {
      console.log('✅ Exact ID match:', exactIdMatch.id);
      return exactIdMatch.id;
    }

    // Partial ID match (ID starts with input)
    const idStartsMatch = clients.find(c => c.id.toLowerCase().startsWith(input));
    if (idStartsMatch) {
      console.log('✅ Partial ID match:', idStartsMatch.id);
      return idStartsMatch.id;
    }

    // Exact name match
    const exactNameMatch = clients.find(c => c.name.toLowerCase() === input);
    if (exactNameMatch) {
      console.log('✅ Exact name match:', exactNameMatch.name);
      return exactNameMatch.name;
    }

    // Name starts with input (strict)
    console.log('🔍 Checking name starts with "' + input + '"...');
    const nameStartsMatch = clients.find(c => {
      const nameLower = c.name.toLowerCase();
      const matches = nameLower.startsWith(input);
      if (matches) console.log(`  ✓ "${c.name}".toLowerCase() = "${nameLower}" starts with "${input}"`);
      return matches;
    });
    if (nameStartsMatch) {
      console.log('✅ Name starts with match:', nameStartsMatch.name);
      return nameStartsMatch.name;
    }
    console.log('  ✗ No names start with "' + input + '"');

    // Check if input contains/starts with any client name (handles "vasan" containing "vas")
    // Sort clients by name length (longer first) to match longer names first
    const sortedByLength = [...clients].sort((a, b) => b.name.length - a.name.length);
    const inputContainsName = sortedByLength.find(c => {
      const nameLower = c.name.toLowerCase();
      const nameNoSpaces = nameLower.replace(/\s+/g, '');

      // Check if input starts with the client name (with or without spaces)
      if (input.startsWith(nameLower)) return true;
      if (inputNoSpaces.startsWith(nameNoSpaces)) return true;

      return false;
    });
    if (inputContainsName) return inputContainsName.name;

    // Check if removing spaces from input matches client name (handles "black are you" -> "blackareyou" ~ "blackayo")
    const noSpaceMatch = clients.find(c => {
      const nameLower = c.name.toLowerCase();
      const nameNoSpaces = nameLower.replace(/\s+/g, '');

      // Check if input without spaces starts with name without spaces
      if (inputNoSpaces.startsWith(nameNoSpaces)) return true;

      // Check if name without spaces starts with input without spaces
      if (nameNoSpaces.startsWith(inputNoSpaces)) return true;

      // Calculate similarity between no-space versions
      const similarity = calculateSimilarity(inputNoSpaces, nameNoSpaces);
      return similarity >= 0.65; // Lower threshold for no-space matching
    });
    if (noSpaceMatch) return noSpaceMatch.name;

    // Check if any word in input matches a client name closely
    const inputWords = input.split(/[\s/]+/);
    for (const inputWord of inputWords) {
      if (inputWord.length < 3) continue; // Skip very short words

      const wordMatch = clients.find(c => {
        const nameLower = c.name.toLowerCase();
        // Check if the input word is very similar to the client name
        const similarity = calculateSimilarity(inputWord, nameLower);
        return similarity >= 0.75;
      });

      if (wordMatch) return wordMatch.name;
    }

    // Check if any word in client name starts with any word in input
    const wordStartsMatch = clients.find(c =>
      c.name.toLowerCase().split(/[\s/]+/).some(nameWord =>
        inputWords.some(inputWord =>
          inputWord.length >= 3 && nameWord.startsWith(inputWord)
        )
      )
    );
    if (wordStartsMatch) return wordStartsMatch.name;

    // Progressive substring matching: If no match found, try progressively shorter substrings
    // "vasant" -> "vasan" -> "vasa" -> "vas" -> find "vas" -> show "vassen"
    // For very short substrings (2 chars), match word boundaries to avoid too many matches
    for (let len = input.length; len >= 2; len--) {
      const substring = input.substring(0, len);

      // For substrings of 3+ characters, use fuzzy prefix matching
      if (len >= 3) {
        console.log(`🔍 Checking len=${len}, substring="${substring}"`);

        // Try exact prefix match first
        const exactMatch = clients.find(c => c.name.toLowerCase().startsWith(substring));
        if (exactMatch) {
          console.log(`✅ Exact match (len=${len}): "${substring}" → ${exactMatch.name}`);
          return exactMatch.name;
        }

        // Try fuzzy match: allow 1 character difference for len >= 4
        if (len >= 4) {
          const fuzzyMatch = clients.find(c => {
            const nameLower = c.name.toLowerCase();
            // Check if the name starts with substring but with 1 char difference
            if (nameLower.length >= len) {
              let differences = 0;
              for (let i = 0; i < len; i++) {
                if (substring[i] !== nameLower[i]) {
                  differences++;
                  if (differences > 1) return false;
                }
              }
              return differences <= 1;
            }
            return false;
          });

          if (fuzzyMatch) {
            console.log(`✅ Fuzzy match (len=${len}): "${substring}" → ${fuzzyMatch.name}`);
            return fuzzyMatch.name;
          }
        }

        // Try to find a client whose ID starts with this substring
        const idPrefixMatch = clients.find(c => c.id.toLowerCase().startsWith(substring));
        if (idPrefixMatch) {
          console.log(`✅ ID match (len=${len}): "${substring}" → ${idPrefixMatch.id}`);
          return idPrefixMatch.id;
        }
        console.log(`⏩ No match for substring "${substring}" (len=${len})`);
      } else {
        // For 2-character substrings, only match at word boundaries to avoid too many matches
        // Match: start of name, after "/", or after space
        console.log(`🔍 Word boundary check for "${substring}" (len=${len})...`);
        const wordBoundaryMatch = clients.find(c => {
          const nameLower = c.name.toLowerCase();

          // Check if name starts with substring
          if (nameLower.startsWith(substring)) {
            console.log(`  ✓ "${c.name}" starts with "${substring}"`);
            return true;
          }

          // Check if any word after "/" starts with substring
          const slashParts = nameLower.split('/');
          if (slashParts.length > 1) {
            for (let i = 1; i < slashParts.length; i++) {
              if (slashParts[i].trim().startsWith(substring)) {
                console.log(`  ✓ "${c.name}" has word after "/" that starts with "${substring}"`);
                return true;
              }
            }
          }

          // Check if any word after space starts with substring
          const spaceParts = nameLower.split(/\s+/);
          if (spaceParts.length > 1) {
            for (let i = 1; i < spaceParts.length; i++) {
              if (spaceParts[i].startsWith(substring)) {
                console.log(`  ✓ "${c.name}" has word after space that starts with "${substring}"`);
                return true;
              }
            }
          }

          return false;
        });

        if (wordBoundaryMatch) {
          console.log(`✅ Word boundary match (len=${len}): "${substring}" → ${wordBoundaryMatch.name}`);
          return wordBoundaryMatch.name;
        }

        console.log(`  ✗ No word boundary match for "${substring}"`);

        // Try ID match for 2-char substrings
        const idPrefixMatch = clients.find(c => c.id.toLowerCase().startsWith(substring));
        if (idPrefixMatch) {
          console.log(`✅ ID boundary match (len=${len}): "${substring}" → ${idPrefixMatch.id}`);
          return idPrefixMatch.id;
        }
      }
    }

    // Fuzzy match - STRICTER: minimum 70% similarity and length must be close
    let bestMatch: { client: Client; score: number; matchType: string } | null = null;

    clients.forEach(client => {
      const nameLower = client.name.toLowerCase();
      const idLower = client.id.toLowerCase();

      // Check similarity with ID
      const idScore = calculateSimilarity(input, idLower);
      if (idScore >= 0.7) {
        if (!bestMatch || idScore > bestMatch.score) {
          bestMatch = { client, score: idScore, matchType: 'id' };
        }
      }

      // Check similarity with full name (only if lengths are reasonably close)
      const nameLengthRatio = Math.min(input.length, nameLower.length) / Math.max(input.length, nameLower.length);
      if (nameLengthRatio >= 0.5) {
        const nameScore = calculateSimilarity(input, nameLower);
        if (nameScore >= 0.7 && (!bestMatch || nameScore > bestMatch.score)) {
          bestMatch = { client, score: nameScore, matchType: 'name' };
        }
      }

      // Check similarity with each word in the name
      const nameWords = nameLower.split(/[\s/]+/);
      nameWords.forEach(word => {
        if (word.length >= 2) {
          const wordLengthRatio = Math.min(input.length, word.length) / Math.max(input.length, word.length);
          if (wordLengthRatio >= 0.5) {
            const wordScore = calculateSimilarity(input, word);
            if (wordScore >= 0.7 && (!bestMatch || wordScore > bestMatch.score)) {
              bestMatch = { client, score: wordScore, matchType: 'word' };
            }
          }
        }
      });
    });

    if (bestMatch) {
      const result = bestMatch.matchType === 'id' ? bestMatch.client.id : bestMatch.client.name;
      console.log(`✅ Fuzzy match: ${bestMatch.matchType} with score ${bestMatch.score.toFixed(2)} → ${result}`);
      return result;
    }

    console.log('❌ No match found for:', input);
    return null;
  };

  // Check if voice recognition is supported
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;

        // Try to find the best matching client
        const bestMatch = findBestClientMatch(transcript);

        // If we found a match, use the matched name/ID for better UX
        // Otherwise use the converted transcript
        const searchQuery = bestMatch || convertSpokenToDigit(transcript);

        onSearchChange(searchQuery);
        setVoiceError(null);
        // Auto-switch to show all clients when voice input is used
        if (!showAllClients) {
          onToggleAllClients();
        }

        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Voice recognition error:', event.error);
        setVoiceError('Voice recognition error. Please try again.');
        setTimeout(() => setVoiceError(null), 3000);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [clients, onSearchChange, onToggleAllClients, showAllClients]);

  const handleVoiceSearch = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting voice recognition:', error);
      }
    }
  };

  // GSAP Draggable setup
  useEffect(() => {
    if (!contentRef.current || !containerRef.current || clients.length === 0) return;

    const container = containerRef.current;
    const content = contentRef.current;
    
    // Kill any existing draggable
    if (draggableRef.current) {
      draggableRef.current.forEach(d => d.kill());
      draggableRef.current = null;
    }

    // Force layout calculation
    gsap.set(content, { x: 0 });
    container.offsetWidth;
    content.offsetWidth;
    
    const containerWidth = container.offsetWidth;
    const contentWidth = content.scrollWidth;
    
    // Always enable dragging for better UX, even with single card
    const overflowAmount = contentWidth - containerWidth;
    const hasOverflow = overflowAmount > 0;
    
    // Determine bounds based on content vs container size
    let bounds;
    if (hasOverflow) {
      // Content overflows container - use container bounds with snapping
      const maxDrag = Math.max(0, contentWidth - containerWidth);
      bounds = {
        minX: -maxDrag,
        maxX: 0
      };
    } else {
      // Content fits in container - use screen bounds, no snapping
      const screenWidth = window.innerWidth;
      const contentRect = content.getBoundingClientRect();
      
      // Use full screen boundaries - no container constraints
      bounds = {
        minX: -contentRect.left, // Left edge of screen
        maxX: screenWidth - contentRect.left - contentWidth // Right edge of screen
      };
    }
    
    // Always create draggable instance
    draggableRef.current = Draggable.create(content, {
      type: "x",
      bounds: bounds,
      edgeResistance: hasOverflow ? 0.5 : 0, // No resistance for free movement
      inertia: true,
      snap: hasOverflow ? false : false, // No snapping for either case
      dragResistance: hasOverflow ? 0.1 : 0, // No drag resistance for free movement
      throwResistance: hasOverflow ? 0.005 : 0.001, // More momentum for free movement
      maxDuration: 2,
      minDuration: 0.02,
      overshootTolerance: 0,
      force3D: true,
      onDragStart: function() {
        const currentX = gsap.getProperty(content, "x") as number;
        dragStartXRef.current = currentX;
        dragDirectionRef.current = null;
      },
      onDrag: function() {
        const currentX = gsap.getProperty(content, "x") as number;
        const deltaX = currentX - dragStartXRef.current;
        
        // Determine drag direction based on movement
        if (Math.abs(deltaX) > 10) {
          if (deltaX > 0) {
            dragDirectionRef.current = 'right';
          } else {
            dragDirectionRef.current = 'left';
          }
        }
      },
      onDragEnd: function(this: any) {
        
        // Only apply snapping logic if content overflows container
        if (hasOverflow) {
          // No snapping - let it stay where dragged within bounds
        }
        // For non-overflowing content, absolutely no snapping - complete free movement
        // The card stays exactly where the user dragged it
        
        dragDirectionRef.current = null;
      }
    });

    return () => {
      if (draggableRef.current) {
        draggableRef.current.forEach(d => d.kill());
        draggableRef.current = null;
      }
    };
  }, [clients.length]); // Recalculate when number of clients changes

  const handleQuickAdd = (client: Client) => {
    onQuickAdd(client);
    // Remove focus from any input fields to dismiss keyboard
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    // Auto-scroll to top to access calculator
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            {showAllClients ? 'All Clients' : 'Active Clients'}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {clients.length} client{clients.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={onToggleAllClients}
              className={`text-xs px-2 py-1 rounded-full transition-colors ${
                showAllClients 
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-blue-100 text-blue-700 font-medium' 
              }`}
            >
              <div className="flex items-center gap-1">
                {showAllClients ? <Users size={12} /> : <UserCheck size={12} />}
                <span>{showAllClients ? 'All' : 'Active'}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Client Cards - Horizontal Scroll */}
      <div className="p-3">
        <div 
          ref={containerRef}
          className="overflow-x-auto overflow-y-visible relative z-10 py-4"
          style={{ 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div 
            ref={contentRef}
            className="flex gap-3 whitespace-nowrap py-2"
            style={{ minWidth: 'max-content' }}
          >
            {clients.length === 0 ? (
              <div className="flex items-center justify-center w-full h-32 text-gray-500">
                <div className="text-center">
                  <p className="text-base sm:text-lg">
                    {showAllClients 
                      ? (searchQuery ? `No clients found matching "${searchQuery}"` : 'No clients found')
                      : 'No clients with outstanding debts'
                    }
                  </p>
                  <p className="text-xs sm:text-sm">Use the calculator to add transactions</p>
                </div>
              </div>
            ) : (
              clients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  onLongPress={() => onClientLongPress(client)}
                  onQuickAdd={handleQuickAdd}
                  onResetCalculator={onResetCalculator}
                  isLinked={linkedClient?.id === client.id}
                  showWobble={recentTransactionClient?.id === client.id}
                  onCloseWobble={onCloseWobble}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-4">
        <div className="relative w-full max-w-md mx-auto">
          {/* Voice Error Message */}
          {voiceError && (
            <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center animate-fade-in">
              {voiceError}
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Voice Search Button */}
            {voiceSupported && (
              <button
                onClick={handleVoiceSearch}
                className={`flex-shrink-0 w-12 h-12 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center shadow-md border-2 transition-all duration-200 ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 border-red-600 text-white animate-pulse'
                    : 'bg-blue-500 hover:bg-blue-600 border-blue-600 text-white'
                }`}
                title={isListening ? 'Stop listening' : 'Voice search by client name or ID'}
              >
                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
            )}

            <div className="relative flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={20} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const newQuery = e.target.value;
                    onSearchChange(newQuery);
                    // Auto-switch to show all clients when user starts typing
                    if (newQuery.trim() && !showAllClients) {
                      onToggleAllClients();
                    }
                  }}
                  placeholder="Search by client name or ID..."
                  className={`block w-full pl-10 ${searchQuery ? 'pr-20' : 'pr-4'} py-3 lg:py-4 text-lg lg:text-xl border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200`}
                />

                {/* Clear Button - Only visible when there's text */}
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute inset-y-0 right-3 my-auto px-3 h-8 bg-red-500 hover:bg-red-600 text-white rounded-md flex items-center justify-center shadow-md border border-red-600 transition-all duration-200 text-sm font-medium"
                    title="Clear search"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientGrid;