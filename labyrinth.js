const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let grid = [];
let size = 21; // Doit être impair pour avoir des murs séparateurs
let playerPos = { x: 1, y: 1 }; // Position du joueur

/**
 * Mélange aléatoirement un tableau.
 * @param {Array} array L'array à mélanger.
 * @returns {Array} L'array mélangé.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Configure les paramètres de génération basés sur la difficulté (1-10)
 */
function generer() {
    try {
        const diffInput = document.getElementById('maze-difficulty');
        const level = diffInput ? parseInt(diffInput.value) : 5;

        // 1. Taille dynamique : chaque niveau augmente la grille (toujours impair)
        // Formule : Niveau 1 = 11, chaque niveau ajoute 4 cases (+8 pour les niveaux experts)
        size = 7 + (level * 4);
        if (level > 7) size += 4; // Accélération de la taille pour les niveaux 8, 9, 10

        // Initialisation : Grille remplie de murs
        grid = Array.from({ length: size }, () => Array(size).fill(1));
        playerPos = { x: 1, y: 1 };

        // 2. Choix de l'algorithme
        if (level <= 3) {
            generatePrim(1, 1);
        } else {
            generateRecursiveBacktracker(1, 1);
            
            // 3. Difficulté 8-10 : Suppression de murs supplémentaires (Cycles)
            if (level >= 8) {
                createComplexFalseLeads(level);
            }
        }

        // Marquer entrée et sortie
        grid[1][1] = 2; // Entrée
        const exitPos = trouverSortieLaPlusLoin(1, 1);
        grid[exitPos.y][exitPos.x] = 3; // Sortie

        dessiner();
        console.log(`✅ Labyrinthe généré (Niveau: ${level}, Taille: ${size})`);
    } catch (e) {
        console.error("Erreur de génération:", e);
        alert("Erreur lors de la génération. Détails en console.");
    }
}

/**
 * Algorithme de Prim : Crée beaucoup d'impasses courtes.
 * Idéal pour les niveaux FACILES.
 */
function generatePrim(startX, startY) {
    grid[startY][startX] = 0;
    let walls = [];

    // Ajouter les murs adjacents au point de départ
    const addWalls = (x, y) => {
        [[0, 2], [0, -2], [2, 0], [-2, 0]].forEach(([dx, dy]) => {
            let nx = x + dx, ny = y + dy;
            if (nx > 0 && nx < size && ny > 0 && ny < size && grid[ny][nx] === 1) {
                walls.push({ x: nx, y: ny, px: x, py: y });
            }
        });
    };

    addWalls(startX, startY);

    while (walls.length > 0) {
        let randomIndex = Math.floor(Math.random() * walls.length);
        let { x, y, px, py } = walls.splice(randomIndex, 1)[0];

        if (grid[y][x] === 1) {
            grid[y][x] = 0; // Devient chemin
            grid[py + (y - py) / 2][px + (x - px) / 2] = 0; // Casse le mur entre les deux
            addWalls(x, y);
        }
    }
}

/**
 * Recursive Backtracker (DFS) : Longs chemins tortueux.
 * Amélioré avec biais directionnel et priorité aux bords.
 */
function generateRecursiveBacktracker(startX, startY) {
    const stack = [{ x: startX, y: startY, lastDx: 0, lastDy: 0 }];
    grid[startY][startX] = 0;

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const { x, y, lastDx, lastDy } = current;
        const neighbors = [];

        [[0, 2], [0, -2], [2, 0], [-2, 0]].forEach(([dx, dy]) => {
            const nx = x + dx, ny = y + dy;
            if (nx > 0 && nx < size && ny > 0 && ny < size && grid[ny][nx] === 1) {
                let weight = 10; // Poids de base

                // Task 3: Priorité aux bords et coins (remplissage périphérique)
                if (nx <= 2 || nx >= size - 3 || ny <= 2 || ny >= size - 3) {
                    weight += 15;
                }

                // Task 2: Biais de direction (favorise les lignes droites à ~70%)
                if (dx === lastDx && dy === lastDy) {
                    weight += 30;
                }

                neighbors.push({ nx, ny, dx, dy, weight });
            }
        });

        if (neighbors.length > 0) {
            // Sélection pondérée pour l'imprévisibilité contrôlée
            const totalWeight = neighbors.reduce((sum, n) => sum + n.weight, 0);
            let random = Math.random() * totalWeight;
            let chosen = neighbors[0];

            for (const n of neighbors) {
                random -= n.weight;
                if (random <= 0) {
                    chosen = n;
                    break;
                }
            }

            grid[chosen.ny][chosen.nx] = 0;
            grid[y + chosen.dy / 2][x + chosen.dx / 2] = 0;
            stack.push({ x: chosen.nx, y: chosen.ny, lastDx: chosen.dx, lastDy: chosen.dy });
        } else {
            stack.pop(); // Backtrack
        }
    }
}

/**
 * Pour les niveaux 8-10 : Connecte des impasses pour créer des boucles complexes.
 */
function createComplexFalseLeads(level) {
    const deadEnds = [];
    for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
            if (grid[y][x] === 0) {
                let paths = 0;
                [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
                    if (grid[y + dy][x + dx] === 0) paths++;
                });
                if (paths === 1) deadEnds.push({ x, y });
            }
        }
    }

    shuffleArray(deadEnds);
    const loopsToCreate = (level - 7) * 10; // Création massive de boucles pour le mode expert
    let created = 0;

    for (const de of deadEnds) {
        if (created >= loopsToCreate) break;
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        shuffleArray(dirs);

        for (const [dx, dy] of dirs) {
            const wx = de.x + dx, wy = de.y + dy;
            const nx = de.x + dx * 2, ny = de.y + dy * 2;
            if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && grid[wy][wx] === 1 && grid[ny][nx] === 0) {
                grid[wy][wx] = 0;
                created++;
                break;
            }
        }
    }
}

/**
 * Calcule le point de sortie le plus éloigné de l'entrée (BFS).
 */
function trouverSortieLaPlusLoin(startX, startY) {
    let distances = Array.from({ length: size }, () => Array(size).fill(-1));
    let queue = [[startX, startY]];
    distances[startY][startX] = 0;
    let maxDist = 0;
    let exitPos = { x: startX, y: startY };

    while (queue.length > 0) {
        let [x, y] = queue.shift();
        [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
            let nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size && (grid[ny][nx] === 0 || grid[ny][nx] === 2) && distances[ny][nx] === -1) {
                distances[ny][nx] = distances[y][x] + 1;
                queue.push([nx, ny]);
                if (distances[ny][nx] > maxDist) {
                    maxDist = distances[ny][nx];
                    exitPos = { x: nx, y: ny };
                }
            }
        });
    }
    return exitPos;
}

// Ajoute bien "async" devant la fonction
async function resoudre() {
    // Vérification : le labyrinthe a-t-il été généré ?
    if (!grid || grid.length === 0) {
        alert("Veuillez d'abord générer un labyrinthe !");
        return;
    }

    let start = { x: 1, y: 1 };
    let end = null;

    // Rechercher dynamiquement la position de la sortie (marquée par 3)
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (grid[y][x] === 3) {
                end = { x, y };
                break;
            }
        }
        if (end) break;
    }

    const canvas = document.getElementById('maze-canvas');
    const ctx = canvas.getContext('2d');
    
    // Redessiner le labyrinthe d'abord pour avoir une base propre
    dessiner();
    
    let openSet = [start];
    let cameFrom = new Map();
    let gScore = { "1,1": 0 };
    let closedSet = new Set(); // Ensemble des nœuds déjà explorés
    
    const h = (x, y) => Math.abs(x - end.x) + Math.abs(y - end.y);
    let iterations = 0;
    const maxIterations = size * size * 2; // Limite pour éviter les boucles infinies

    while (openSet.length > 0 && iterations < maxIterations) {
        iterations++;
        
        // 1. On trie pour prendre le meilleur nœud (A*)
        openSet.sort((a, b) => (gScore[`${a.x},${a.y}`] + h(a.x, a.y)) - (gScore[`${b.x},${b.y}`] + h(b.x, b.y)));
        let current = openSet.shift();
        
        let currentKey = `${current.x},${current.y}`;
        
        // Si déjà exploré, passer
        if (closedSet.has(currentKey)) continue;
        closedSet.add(currentKey);

        // Pause tous les 10 itérations pour laisser le navigateur respirer
        if (iterations % 10 === 0) {
            await sleep(10);
        }

        if (current.x === end.x && current.y === end.y) {
            // Redessiner le labyrinthe proprement avant d'afficher le chemin
            dessiner();
            reconstruireChemin(cameFrom, current);
            alert("✅ Résolution trouvée ! Le chemin optimal est affiché en jaune.");
            return;
        }

        for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            let nx = current.x + dx, ny = current.y + dy;
            let neighborKey = `${nx},${ny}`;
            
            // Vérification des limites, des murs, et si déjà exploré
            if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[ny][nx] !== 1 && !closedSet.has(neighborKey)) {
                let tentativeG = gScore[currentKey] + 1;

                if (tentativeG < (gScore[neighborKey] || Infinity)) {
                    cameFrom.set(neighborKey, current);
                    gScore[neighborKey] = tentativeG;
                    if (!openSet.find(n => n.x === nx && n.y === ny)) {
                        openSet.push({x: nx, y: ny});
                    }
                }
            }
        }
    }
    alert("Pas de solution trouvée !");
}

function dessiner() {
    const canvas = document.getElementById('maze-canvas');
    const ctx = canvas.getContext('2d');
    
    // Sécurité : Forcer le redimensionnement si le canvas fait 0 pixel
    const container = canvas.parentElement;
    if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = Math.max(200, container.clientWidth - 40);
        canvas.height = Math.max(200, container.clientHeight - 40);
    }

    const cellSize = Math.min(canvas.width, canvas.height) / size;
    const offsetX = (canvas.width - (cellSize * size)) / 2;
    const offsetY = (canvas.height - (cellSize * size)) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (grid[y][x] === 1) ctx.fillStyle = "#2c3e50"; // Mur
            else if (grid[y][x] === 0) ctx.fillStyle = "#ecf0f1"; // Chemin
            else if (grid[y][x] === 2) ctx.fillStyle = "#27ae60"; // Entrée
            else if (grid[y][x] === 3) ctx.fillStyle = "#e74c3c"; // Sortie
            ctx.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, cellSize);
        }
    }
}

function reconstruireChemin(cameFrom, current) {
    const canvas = document.getElementById('maze-canvas');
    const ctx = canvas.getContext('2d');
    const cellSize = Math.min(canvas.width, canvas.height) / size;
    const offsetX = (canvas.width - (cellSize * size)) / 2;
    const offsetY = (canvas.height - (cellSize * size)) / 2;

    ctx.fillStyle = "#f1c40f"; // Couleur du chemin de résolution
    
    let key = `${current.x},${current.y}`;
    while (cameFrom.has(key)) {
        current = cameFrom.get(key);
        key = `${current.x},${current.y}`;
        ctx.fillRect(offsetX + current.x * cellSize + cellSize/4, offsetY + current.y * cellSize + cellSize/4, cellSize/2, cellSize/2);
    }
}

// --- Système de Mouvement du Joueur ---
function movePlayer(key) {
    let dx = 0, dy = 0;
    
    // Convertir les touches en déplacements
    if (key === 'z' || key === 'arrowup') dy = -1;
    else if (key === 's' || key === 'arrowdown') dy = 1;
    else if (key === 'q' || key === 'arrowleft') dx = -1;
    else if (key === 'd' || key === 'arrowright') dx = 1;
    
    const newX = playerPos.x + dx;
    const newY = playerPos.y + dy;
    
    // Vérifier que la nouvelle position est valide (pas un mur)
    if (newX >= 0 && newX < size && newY >= 0 && newY < size && grid[newY][newX] !== 1) {
        playerPos.x = newX;
        playerPos.y = newY;
        
        // Redessiner le labyrinthe avec le joueur
        dessiner();
        drawPlayer();
        
        // Vérifier si le joueur a atteint la sortie
        if (grid[newY][newX] === 3) {
            // Afficher le modal de victoire
            showVictory();
        }
        return true;
    }
    return false;
}

// Fonction pour afficher le modal de victoire avec confettis
function showVictory() {
    const steps = typeof window.stepsCount !== 'undefined' ? window.stepsCount : '?';
    const victoryModal = document.getElementById('victory-modal');
    const victorySteps = document.getElementById('victory-steps');
    
    if (victoryModal) {
        victorySteps.textContent = steps;
        victoryModal.style.display = 'flex';
        
        // Lancer l'animation des confettis
        launchConfetti();
    }
}

// Fonction pour les confettis
function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    const confettis = [];
    const confettiCount = 100;
    
    // Créer les confettis
    for (let i = 0; i < confettiCount; i++) {
        confettis.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            vx: (Math.random() - 0.5) * 8,
            vy: Math.random() * 4 + 4,
            size: Math.random() * 6 + 2,
            color: ['#f1c40f', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6'][Math.floor(Math.random() * 5)],
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10
        });
    }
    
    // Animation des confettis
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let confetti of confettis) {
            // Mise à jour de la position
            confetti.x += confetti.vx;
            confetti.y += confetti.vy;
            confetti.vy += 0.1; // Gravité
            confetti.rotation += confetti.rotationSpeed;
            
            // Dessiner le confetti
            ctx.save();
            ctx.translate(confetti.x, confetti.y);
            ctx.rotate((confetti.rotation * Math.PI) / 180);
            ctx.fillStyle = confetti.color;
            ctx.fillRect(-confetti.size / 2, -confetti.size / 2, confetti.size, confetti.size);
            ctx.restore();
            
            // Retirer les confettis qui sont sortis de l'écran
            if (confetti.y > canvas.height) {
                confettis.splice(confettis.indexOf(confetti), 1);
            }
        }
        
        if (confettis.length > 0) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

function drawPlayer() {
    const canvas = document.getElementById('maze-canvas');
    const ctx = canvas.getContext('2d');
    
    const cellSize = Math.min(canvas.width, canvas.height) / size;
    const offsetX = (canvas.width - (cellSize * size)) / 2;
    const offsetY = (canvas.height - (cellSize * size)) / 2;
    
    // Dessiner le joueur en bleu
    ctx.fillStyle = "#3498db";
    ctx.fillRect(
        offsetX + playerPos.x * cellSize + cellSize/4, 
        offsetY + playerPos.y * cellSize + cellSize/4, 
        cellSize/2, 
        cellSize/2
    );
}