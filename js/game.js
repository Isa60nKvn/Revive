const gameField = document.getElementById('gameField');

const teams = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const STARTING_FLAGS_PER_TEAM = 3;
const TOTAL_FLAGS = teams.length * STARTING_FLAGS_PER_TEAM;

const teamColors = {
    red: '#e74c3c',
    blue: '#3498db',
    green: '#2ecc71',
    yellow: '#f1c40f',
    purple: '#9b59b6',
    orange: '#e67e22'
};

// We will calculate these dynamically
let baseRects = {};

// Flags at bases
const flags = [];
// Players: 1 Guardian, 1 Tagger, 1 Runner
const players = [];

// Helper to check for collision between two elements
function isColliding(el1, el2) {
    if (!el1 || !el2) return false;
    const rect1 = el1.getBoundingClientRect();
    const rect2 = el2.getBoundingClientRect();
    return !(
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
    );
}

// Helper to check if a player is inside a specific base
function isInsideBase(playerEl, baseId) {
    if (!playerEl) return false;
    const playerRect = playerEl.getBoundingClientRect();
    const baseEl = document.getElementById(baseId);
    if (!baseEl) return false;
    const baseRect = baseEl.getBoundingClientRect();
    // Check if player's center is inside the base, gives a better feel
    const playerCenterX = playerRect.left + playerRect.width / 2;
    const playerCenterY = playerRect.top + playerRect.height / 2;

    return (
        playerCenterX > baseRect.left &&
        playerCenterX < baseRect.right &&
        playerCenterY > baseRect.top &&
        playerCenterY < baseRect.bottom
    );
}


// A robust draggable function that works across all screen sizes
function makeDraggable(el) {
    let offsetX, offsetY;
    const player = players.find(p => p.id === el.id);

    function move(pageX, pageY) {
        // Store the original position in case we need to revert
        const oldLeft = el.offsetLeft;
        const oldTop = el.offsetTop;
        
        const gameFieldRect = gameField.getBoundingClientRect();

        // Calculate new position relative to the game field
        let newLeft = pageX - gameFieldRect.left - offsetX;
        let newTop = pageY - gameFieldRect.top - offsetY;

        // Boundary checks for the game field
        newLeft = Math.max(0, Math.min(newLeft, gameField.clientWidth - el.clientWidth));
        newTop = Math.max(0, Math.min(newTop, gameField.clientHeight - el.clientHeight));
        
        // Guardian role restriction (applied before the move)
        if (player && player.role === 'guardian') {
            const baseRect = baseRects[player.team];
            newLeft = Math.max(baseRect.left, Math.min(newLeft, baseRect.right - el.clientWidth));
            newTop = Math.max(baseRect.top, Math.min(newTop, baseRect.bottom - el.clientHeight));
        }

        // Tentatively apply the new position
        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';

        // Tagger role validation (applied after the move)
        if (player && player.role === 'tagger') {
            let isInAnyBase = false;
            for (const team of teams) {
                if (isInsideBase(el, `base-${team}`)) {
                    isInAnyBase = true;
                    break;
                }
            }
            // If the new position is invalid, revert to the old one
            if (isInAnyBase) {
                el.style.left = oldLeft + 'px';
                el.style.top = oldTop + 'px';
            }
        }
        
        // Update the player's object with the final, validated coordinates
        if (player) {
            player.x = el.offsetLeft;
            player.y = el.offsetTop;
        }

        // If the player is carrying a flag, move the flag with them
        if (player && player.carryingFlag) {
            const flag = flags.find(f => f.id === player.carryingFlag);
            const flagEl = document.getElementById(flag.id);
            if (flag && flagEl) {
                flag.x = el.offsetLeft;
                flag.y = el.offsetTop;
                flagEl.style.left = el.offsetLeft + 'px';
                flagEl.style.top = el.offsetTop + 'px';
            }
        }
        // Check for interactions after every move
        checkCollisions();
    }

    function startDrag(pageX, pageY) {
        const rect = el.getBoundingClientRect();
        offsetX = pageX - rect.left;
        offsetY = pageY - rect.top;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    }
    
    // Mouse Events
    function onMouseDown(e) {
        e.preventDefault();
        startDrag(e.pageX, e.pageY);
    }
    function onMouseMove(e) {
        e.preventDefault();
        move(e.pageX, e.pageY);
    }
    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
    el.addEventListener('mousedown', onMouseDown);
    
    // Touch Events
    function onTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            startDrag(e.touches[0].pageX, e.touches[0].pageY);
        }
    }
    function onTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            move(e.touches[0].pageX, e.touches[0].pageY);
        }
    }
    function onTouchEnd() {
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
    }
    el.addEventListener('touchstart', onTouchStart, { passive: false });
}

function checkCollisions() {
    players.forEach(player => {
        const playerEl = document.getElementById(player.id);
        if (!playerEl) return;

        if (player.role === 'runner') {
            if (player.carryingFlag) {
                // --- SCORING LOGIC WITH DELAY ---
                const homeBaseEl = document.getElementById(`base-${player.team}`);
                const isInHomeBase = isInsideBase(playerEl, homeBaseEl.id);

                if (isInHomeBase && !player.isScoring) {
                    // Runner has entered the base, start the scoring timer.
                    player.isScoring = true;
                    player.scoringTimeoutId = setTimeout(() => {
                        // Timer finished, complete the score.
                        const flag = flags.find(f => f.id === player.carryingFlag);
                        if (!flag || !player.carryingFlag) return; // Check if still carrying flag
                        
                        const flagEl = document.getElementById(flag.id);
                        if (!flagEl) return;
                        
                        flag.team = player.team;
                        flagEl.style.color = teamColors[player.team];
                        dropFlag(player);
                        
                        // Reset scoring state
                        player.isScoring = false;
                        player.scoringTimeoutId = null;

                    }, 300); // 300ms delay before dropping the flag
                
                } else if (!isInHomeBase && player.isScoring) {
                    // Runner left the base before the timer finished, so cancel the score.
                    clearTimeout(player.scoringTimeoutId);
                    player.isScoring = false;
                    player.scoringTimeoutId = null;
                }
            } else {
                // --- FLAG PICKUP LOGIC ---
                flags.forEach(flag => {
                    if (player.team !== flag.team && !flag.carrier) {
                        const flagEl = document.getElementById(flag.id);
                        if (isColliding(playerEl, flagEl)) {
                            player.carryingFlag = flag.id;
                            flag.carrier = player.id;
                            flagEl.style.pointerEvents = 'none';
                        }
                    }
                });
            }
        }

        // --- TAGGING LOGIC ---
        players.forEach(otherPlayer => {
            if (player.team === otherPlayer.team) return;
            const otherPlayerEl = document.getElementById(otherPlayer.id);
            if (!otherPlayerEl || !isColliding(playerEl, otherPlayerEl)) return;

            const runner = (player.role === 'runner') ? player : (otherPlayer.role === 'runner') ? otherPlayer : null;
            const tagger = (player.role === 'tagger' || player.role === 'guardian') ? player : (otherPlayer.role === 'tagger' || otherPlayer.role === 'guardian') ? otherPlayer : null;
            
            if (runner && tagger && runner.carryingFlag) {
                if (tagger.role === 'guardian' && isInsideBase(runner.el, `base-${tagger.team}`)) {
                    dropFlag(runner);
                    resetPlayerToBase(runner);
                } else if (tagger.role === 'tagger') {
                    let inAnyBase = teams.some(team => isInsideBase(runner.el, `base-${team}`));
                    if (!inAnyBase) {
                        dropFlag(runner);
                        const runnerEl = document.getElementById(runner.id);
                        if(runnerEl) {
                            runnerEl.classList.add('tagged-by-tagger');
                            setTimeout(() => runnerEl.classList.remove('tagged-by-tagger'), 800);
                        }
                    }
                }
            }
        });
    });
}

// Function to handle dropping a flag
function dropFlag(runner) {
    const flag = flags.find(f => f.id === runner.carryingFlag);
    if (!flag) return;
    
    const flagEl = document.getElementById(flag.id);
    runner.carryingFlag = null;
    flag.carrier = null;
    if (flagEl) {
        flagEl.style.pointerEvents = 'auto';
    }
    setTimeout(updateFlagCounters, 50);
}

function updateFlagCounters() {
    teams.forEach(team => {
        const baseEl = document.getElementById(`base-${team}`);
        const counterEl = baseEl.querySelector('.flag-counter');
        if (!counterEl) return;

        let flagCount = 0;
        flags.forEach(flag => {
            // **FIX:** A flag is counted if its CURRENT team matches the base team
            // and it is physically inside the base without a carrier.
            if (flag.team === team && !flag.carrier) {
                const flagEl = document.getElementById(flag.id);
                if (isColliding(flagEl, baseEl)) {
                    flagCount++;
                }
            }
        });
        
        counterEl.textContent = flagCount;
    });
}

// Function to send a player back to their base with animation
function resetPlayerToBase(player) {
    const playerEl = document.getElementById(player.id);
    if (!playerEl) return;

    playerEl.style.pointerEvents = 'none';
    playerEl.classList.add('player-returning');
    
    const isTaggedOnLeftSide = playerEl.offsetLeft < gameField.clientWidth / 2;
    const exitX = isTaggedOnLeftSide ? '-100px' : (gameField.clientWidth + 100) + 'px';
    playerEl.style.left = exitX;

    setTimeout(() => {
        playerEl.classList.remove('player-returning');
        const homeBaseRect = baseRects[player.team];
        const isHomeBaseOnLeftSide = homeBaseRect.left < gameField.clientWidth / 2;

        const entryX = isHomeBaseOnLeftSide ? '-100px' : (gameField.clientWidth + 100) + 'px';
        const finalX = homeBaseRect.left + (homeBaseRect.width / 2) - (playerEl.clientWidth / 2);
        const finalY = homeBaseRect.top + (homeBaseRect.height / 2) - (playerEl.clientHeight / 2);
        
        playerEl.style.left = entryX;
        playerEl.style.top = finalY + 'px';

        void playerEl.offsetWidth;

        playerEl.classList.add('player-returning');
        playerEl.style.left = finalX + 'px';

        player.x = finalX;
        player.y = finalY;

        setTimeout(() => {
            playerEl.style.pointerEvents = 'auto';
            playerEl.classList.remove('player-returning');
        }, 500);

    }, 500);
}

// Recalculates and repositions all elements
function repositionElements() {
    const gameFieldRect = gameField.getBoundingClientRect();

    teams.forEach(team => {
        const baseEl = document.getElementById(`base-${team}`);
        if (baseEl) {
            baseRects[team] = {
                left: baseEl.offsetLeft,
                top: baseEl.offsetTop,
                right: baseEl.offsetLeft + baseEl.offsetWidth,
                bottom: baseEl.offsetTop + baseEl.offsetHeight,
                width: baseEl.offsetWidth,
                height: baseEl.offsetHeight
            };
        }
    });

    // Reposition only the home flags that haven't been moved
    flags.forEach(flag => {
        const originalTeam = flag.id.split('-')[1];
        if (flag.team === originalTeam && !flag.carrier) {
            const flagEl = document.getElementById(flag.id);
            const baseRect = baseRects[flag.team];
            const flagIndex = parseInt(flag.id.split('-')[2]);
            
            flag.x = baseRect.left + 20 + (flagIndex * (flagEl.clientWidth + 10));
            flag.y = baseRect.top + 20;

            flagEl.style.left = flag.x + 'px';
            flagEl.style.top = flag.y + 'px';
        }
    });

    players.forEach(p => {
        const playerEl = document.getElementById(p.id);
        const baseRect = baseRects[p.team];
        
        if (p.role === 'guardian') {
            p.x = baseRect.left + (baseRect.width / 2) - (playerEl.clientWidth / 2);
            p.y = baseRect.top + (baseRect.height / 2) - (playerEl.clientHeight / 2);
        } else if (p.role === 'runner') {
            p.x = baseRect.left + (baseRect.width / 3) - (playerEl.clientWidth / 2);
            p.y = baseRect.top + (baseRect.height / 3) - (playerEl.clientHeight / 2);
        } else if (p.role === 'tagger') {
            const isLeftSide = ['red', 'green', 'purple'].includes(p.team);
            if (isLeftSide) {
                p.x = baseRect.right + 10;
            } else {
                p.x = baseRect.left - playerEl.clientWidth - 10;
            }
            p.y = baseRect.top + (baseRect.height / 2) - (playerEl.clientHeight / 2);
        }
        
        playerEl.style.left = p.x + 'px';
        playerEl.style.top = p.y + 'px';
    });
    updateFlagCounters();
}

// Initial setup
// Initial setup
function setupGame() {
    const gameFieldContent = document.createDocumentFragment();
    
    // Create bases and add their counters
    teams.forEach(team => {
        const baseDiv = document.createElement('div');
        baseDiv.className = `base base-${team}`;
        baseDiv.id = `base-${team}`;
        baseDiv.innerHTML = `<div class="flag-counter">0</div>`;
        gameFieldContent.appendChild(baseDiv);
    });

    // Create flags
    flags.length = 0;
    teams.forEach(team => {
        for (let i = 0; i < STARTING_FLAGS_PER_TEAM; i++) {
            const flagId = `flag-${team}-${i}`;
            flags.push({ id: flagId, team, carrier: null });

            const i_tag = document.createElement('i');
            i_tag.className = 'flag fas fa-flag';
            i_tag.id = flagId;
            i_tag.style.color = teamColors[team];
            gameFieldContent.appendChild(i_tag);
        }
    });

    // Create players
    players.length = 0;
    teams.forEach(team => {
        ['guardian', 'tagger', 'runner'].forEach(role => {
            const playerId = `${team}-${role.charAt(0).toUpperCase()}`;
            const playerObject = { 
                id: playerId, 
                role, 
                team, 
                carryingFlag: null 
            };
            if (role === 'runner') {
                playerObject.isScoring = false;
                playerObject.scoringTimeoutId = null;
            }
            players.push(playerObject);
            
            const div = document.createElement('div');
            div.className = 'player';
            div.id = playerId;
            div.innerText = role[0].toUpperCase();
            div.style.backgroundColor = teamColors[team];
            
            playerObject.el = div; 
            makeDraggable(div);
            gameFieldContent.appendChild(div);
        });
    });

    // **FIX:** Create and add the center area back in
    const centerAreaDiv = document.createElement('div');
    centerAreaDiv.className = 'center-area';
    centerAreaDiv.textContent = 'FREE SPACE AREA FREE SPACE AREA FREE SPACE AREA FREE SPACE AREA FREE SPACE AREA FREE SPACE AREA';
    gameFieldContent.appendChild(centerAreaDiv);

    // Replace the game field content in one go
    gameField.innerHTML = '';
    gameField.appendChild(gameFieldContent);
    repositionElements();
}

/**
 * **FIX:** A simple debug checker to ensure no flags are ever lost.
 * It runs every 3 seconds and checks if the number of flag elements
 * in the game matches the expected total.
 */
function debugCheckFlagCount() {
    const currentFlagCount = document.querySelectorAll('.flag').length;
    if (currentFlagCount !== TOTAL_FLAGS) {
        console.error(`CRITICAL ERROR: Flag count is incorrect! Expected ${TOTAL_FLAGS}, but found ${currentFlagCount}.`);
        // As a recovery mechanism, you could force a full game reset here
        // setupGame();
    }
}


window.addEventListener('resize', repositionElements);
// Initial setup call
setupGame();
// Start the flag checker
setInterval(debugCheckFlagCount, 3000);