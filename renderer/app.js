function dessiner() {
    const cellSize = canvas.width / size;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (grid[y][x] === 1) ctx.fillStyle = "#2c3e50"; // Mur
            else if (grid[y][x] === 0) ctx.fillStyle = "#ecf0f1"; // Chemin
            else if (grid[y][x] === 2) ctx.fillStyle = "#27ae60"; // Entrée
            else if (grid[y][x] === 3) ctx.fillStyle = "#e74c3c"; // Sortie
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }
}

function reconstruireChemin(cameFrom, current) {
    const cellSize = canvas.width / size;
    ctx.fillStyle = "#f1c40f"; // Couleur du chemin de résolution
    
    let key = `${current.x},${current.y}`;
    while (cameFrom.has(key)) {
        current = cameFrom.get(key);
        key = `${current.x},${current.y}`;
        ctx.fillRect(current.x * cellSize + cellSize/4, current.y * cellSize + cellSize/4, cellSize/2, cellSize/2);
    }
}