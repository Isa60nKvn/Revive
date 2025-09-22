const gameField = document.getElementById('gameField');
const fieldWidth = gameField.clientWidth;
const fieldHeight = gameField.clientHeight;

const teams = ['red','blue','green','yellow','purple','orange'];

const teamColors = {
    red: '#e74c3c',
    blue: '#3498db',
    green: '#2ecc71',
    yellow: '#f1c40f',
    purple: '#9b59b6',
    orange: '#e67e22'
};

// Base positions
const basePositions = {
    red: {x:30, y:30},
    blue: {x:fieldWidth-170, y:30},
    green: {x:30, y:fieldHeight-170},
    yellow: {x:fieldWidth-170, y:fieldHeight-170},
    purple: {x:30, y:fieldHeight/2-70},
    orange: {x:fieldWidth-170, y:fieldHeight/2-70}
};

// Flags at bases
const flags = [];
teams.forEach(team => {
    for(let i=0;i<3;i++){
        flags.push({
            team,
            x: basePositions[team].x + i*20,
            y: basePositions[team].y
        });
    }
});

// Players: 1 Guardian, 1 Tagger, 1 Runner
const players = [];
teams.forEach(team => {
    players.push({ id: `${team}-G`, role:'guardian', team, x: basePositions[team].x + 50, y: basePositions[team].y + 50 });
    players.push({ id: `${team}-T`, role:'tagger', team, x: basePositions[team].x + 80, y: basePositions[team].y + 50 });
    players.push({ id: `${team}-R`, role:'runner', team, x: basePositions[team].x + 110, y: basePositions[team].y + 50 });
});

// Helper to make elements draggable
function makeDraggable(el){
    let offsetX, offsetY;
    el.onmousedown = function(e){
        offsetX = e.clientX - el.offsetLeft;
        offsetY = e.clientY - el.offsetTop;
        document.onmousemove = function(e){
            el.style.left = (e.clientX - offsetX) + 'px';
            el.style.top = (e.clientY - offsetY) + 'px';
        }
        document.onmouseup = function(){
            document.onmousemove = null;
            document.onmouseup = null;
        }
    }
}

function getFieldSize() {
    return {
        width: gameField.clientWidth,
        height: gameField.clientHeight
    };
}

function getBasePositions() {
    const { width, height } = getFieldSize();
    return {
        red:    { x: 0.03 * width, y: 0.03 * height },
        blue:   { x: width - 0.19 * width, y: 0.03 * height },
        green:  { x: 0.03 * width, y: height - 0.19 * height },
        yellow: { x: width - 0.19 * width, y: height - 0.19 * height },
        purple: { x: 0.03 * width, y: height/2 - 0.10 * height },
        orange: { x: width - 0.19 * width, y: height/2 - 0.10 * height }
    };
}

// Reposition all elements
function repositionElements() {
    const basePositions = getBasePositions();

    // Update flags
    flags.forEach((f, i) => {
        // Recalculate flag position relative to base
        f.x = basePositions[f.team].x + (i % 3) * 0.03 * getFieldSize().width;
        f.y = basePositions[f.team].y;
        const div = document.getElementById(`flag-${i}`);
        if (div) {
            div.style.left = f.x + 'px';
            div.style.top = f.y + 'px';
        }
    });

    // Update players
    players.forEach(p => {
        p.x = basePositions[p.team].x + (p.role === 'guardian' ? 0.06 : p.role === 'tagger' ? 0.10 : 0.14) * getFieldSize().width;
        p.y = basePositions[p.team].y + 0.06 * getFieldSize().height;
        const div = document.getElementById(p.id);
        if (div) {
            div.style.left = p.x + 'px';
            div.style.top = p.y + 'px';
        }
    });
}

// Initial positions
function setupGame() {
    repositionElements();
}

// On window resize, reposition everything
window.addEventListener('resize', () => {
    repositionElements();
});

// Render flags
flags.forEach((f,i)=>{
    const div = document.createElement('div');
    div.className = 'flag';
    div.id = `flag-${i}`;
    div.style.left = f.x + 'px';
    div.style.top = f.y + 'px';
    div.style.backgroundColor = teamColors[f.team];
    gameField.appendChild(div);
    makeDraggable(div);
});

// Render players
players.forEach(p=>{
    const div = document.createElement('div');
    div.className = 'player';
    div.id = p.id;
    div.innerText = p.role[0].toUpperCase();
    div.style.left = p.x + 'px';
    div.style.top = p.y + 'px';
    div.style.backgroundColor = teamColors[p.team];
    gameField.appendChild(div);
    makeDraggable(div);
});

setupGame();