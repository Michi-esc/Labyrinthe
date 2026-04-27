const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let grid = [];
let size = 21; // Doit être impair pour avoir des murs séparateurs
const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');

function generer() {
    size = parseInt(document.getElementById('size').value);
    // Initialisation : Tout est un mur (1)
    grid = Array.from({ length: size }, () => Array(size).fill(1));

    function walk(x, y) {
        grid[y][x] = 0; // On creuse la cellule actuelle

        // Directions aléatoires : Haut, Bas, Gauche, Droite
        const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]].sort(() => Math.random() - 0.5);

        for (let [dx, dy] of dirs) {
            let nx = x + dx, ny = y + dy;
            if (nx > 0 && nx < size && ny > 0 && ny < size && grid[ny][nx] === 1) {
                grid[y + dy / 2][x + dx / 2] = 0; // On casse le mur entre les deux
                walk(nx, ny);
            }
        }
    }

    walk(1, 1); // Point de départ
    grid[1][1] = 2; // Entrée
    grid[size - 2][size - 2] = 3; // Sortie
    dessiner();
}

// Ajoute bien "async" devant la fonction
async function resoudre() {
    let start = { x: 1, y: 1 };
    let end = { x: size - 2, y: size - 2 };
    let openSet = [start];
    let cameFrom = new Map();
    let gScore = { "1,1": 0 };
    
    const h = (x, y) => Math.abs(x - end.x) + Math.abs(y - end.y);

    while (openSet.length > 0) {
        // 1. On trie pour prendre le meilleur nœud (A*)
        openSet.sort((a, b) => (gScore[`${a.x},${a.y}`] + h(a.x, a.y)) - (gScore[`${b.x},${b.y}`] + h(b.x, b.y)));
        let current = openSet.shift();

        // --- OPTIMISATION VISUELLE & MÉMOIRE ---
        // On dessine un petit point pour montrer l'exploration (optionnel mais stylé)
        ctx.fillStyle = "rgba(241, 196, 15, 0.2)"; 
        ctx.fillRect(current.x * (canvas.width/size), current.y * (canvas.width/size), (canvas.width/size), (canvas.width/size));

        // 2. PAUSE : C'est cette ligne qui empêche le crash
        // On attend 1ms (ou 0) pour rendre la main au navigateur
        await sleep(1); 

        if (current.x === end.x && current.y === end.y) {
            reconstruireChemin(cameFrom, current);
            return;
        }

        for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            let nx = current.x + dx, ny = current.y + dy;
            
            // Vérification des limites et des murs
            if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[ny][nx] !== 1) {
                let tentativeG = gScore[`${current.x},${current.y}`] + 1;
                let key = `${nx},${ny}`;

                if (tentativeG < (gScore[key] || Infinity)) {
                    cameFrom.set(key, current);
                    gScore[key] = tentativeG;
                    if (!openSet.find(n => n.x === nx && n.y === ny)) {
                        openSet.push({x: nx, y: ny});
                    }
                }
            }
        }
    }
    alert("Pas de solution trouvée !");
}