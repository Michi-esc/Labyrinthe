// @ts-nocheck
/* eslint-disable no-undef */

// --- Données Fictives (Mock) pour simuler SQLite ---
let labyrinthes = [
    { id: 1, name: 'Labyrinthe d\'Initiation', difficulty: 2 },
    { id: 2, name: 'Le Dédale du Minotaure', difficulty: 9 },
    { id: 3, name: 'Chemin Perdu', difficulty: 5 }
];

// --- Données Fictives pour simuler les utilisateurs ---
let currentUser = { id: 1, username: 'admin', role: 'admin' }; // Role simulé
let mockUsers = [
    { id: 1, username: 'admin', role: 'admin', mazesCount: 12 },
    { id: 2, username: 'joueur1', role: 'user', mazesCount: 3 },
    { id: 3, username: 'createur_fou', role: 'user', mazesCount: 8 }
];

document.addEventListener('DOMContentLoaded', () => {
    // --- Éléments du DOM ---
    // Vues
    const viewLogin = document.getElementById('view-login');
    const viewDashboard = document.getElementById('view-dashboard');
    const viewEditor = document.getElementById('view-editor');
    const viewAdmin = document.getElementById('view-admin');

    // Boutons de navigation
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');
    const btnNewMaze = document.getElementById('btn-new-maze');
    const btnBack = document.getElementById('btn-back');
    const btnAdmin = document.getElementById('btn-admin');
    const btnBackFromAdmin = document.getElementById('btn-back-from-admin');

    // Tableau et Formulaire
    const tableBody = document.getElementById('maze-table-body');
    const mazeForm = document.getElementById('maze-form');
    const inputId = document.getElementById('maze-id');
    const inputName = document.getElementById('maze-name');
    const inputDifficulty = document.getElementById('maze-difficulty');
    const difficultyDisplay = document.getElementById('difficulty-val');

    // Éditeur (Canvas & Contrôles)
    const canvas = document.getElementById('maze-canvas');
    const ctx = canvas.getContext('2d');
    const btnGenerate = document.getElementById('btn-generate');
    const btnSolve = document.getElementById('btn-solve');
    const btnPlayMode = document.getElementById('btn-play-mode');
    const gameOverlay = document.getElementById('game-overlay');
    const overlaySteps = document.getElementById('overlay-steps');
    const btnQuitGame = document.getElementById('btn-quit-game');

    // Admin
    const usersTableBody = document.getElementById('users-table-body');
    const statTotalMazes = document.getElementById('stat-total-mazes');
    const statActiveUsers = document.getElementById('stat-active-users');

    // --- Logique de Navigation ---
    function switchView(targetView) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        targetView.classList.add('active');
    }

    // Événements de navigation
    btnLogin.addEventListener('click', () => {
        const usernameInput = document.getElementById('username').value.trim();
        
        // Simulation d'accès et attribution du rôle
        if (usernameInput.toLowerCase() === 'adama' || usernameInput.toLowerCase() === 'admin') {
            currentUser = { username: usernameInput || 'Admin', role: 'admin' };
        } else {
            currentUser = { username: usernameInput || 'Utilisateur', role: 'user' };
        }

        if (currentUser.role === 'admin') {
            btnAdmin.style.display = 'inline-block';
        } else {
            btnAdmin.style.display = 'none';
        }
        switchView(viewDashboard);
        renderDashboard();
    });

    btnLogout.addEventListener('click', () => switchView(viewLogin));
    
    btnBack.addEventListener('click', () => switchView(viewDashboard));
    btnBackFromAdmin.addEventListener('click', () => switchView(viewDashboard));

    btnAdmin.addEventListener('click', () => {
        switchView(viewAdmin);
        renderAdminStats();
        renderAdminUsers();
    });

    btnNewMaze.addEventListener('click', () => {
        mazeForm.reset();
        inputId.value = '';
        difficultyDisplay.textContent = inputDifficulty.value;
        if (typeof grid !== 'undefined') grid = []; // Réinitialiser la grille pour ne pas afficher le précédent
        switchView(viewEditor);
        setTimeout(drawPlaceholder, 50); // Le temps que la vue flex se calcule pour le canvas
    });

    // Actualisation du libellé de difficulté
    inputDifficulty.addEventListener('input', (e) => {
        difficultyDisplay.textContent = e.target.value;
    });

    // --- Rendu du Dashboard ---
    function renderDashboard() {
        tableBody.innerHTML = '';
        
        labyrinthes.forEach(maze => {
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td>${maze.name}</td>
                <td>${maze.difficulty} / 10</td>
                <td>
                    <button class="btn-primary btn-edit" data-id="${maze.id}">Éditer</button>
                    <button class="btn-danger btn-delete" data-id="${maze.id}">Supprimer</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Ajout des écouteurs sur les nouveaux boutons générés
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => loadMazeForEdit(parseInt(e.target.dataset.id)));
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => requestDeleteMaze(parseInt(e.target.dataset.id)));
        });
    }

    // --- Gestion CRUD via window.api ---

    // Préparer l'édition
    function loadMazeForEdit(id) {
        const maze = labyrinthes.find(m => m.id === id);
        if (maze) {
            inputId.value = maze.id;
            inputName.value = maze.name;
            inputDifficulty.value = maze.difficulty;
            difficultyDisplay.textContent = maze.difficulty;
            switchView(viewEditor);
            
            setTimeout(() => {
                const container = canvas.parentElement;
                canvas.width = Math.max(0, container.clientWidth - 40); 
                canvas.height = Math.max(0, container.clientHeight - 40);
                
                if (maze.gridData && typeof dessiner === 'function') {
                    grid = JSON.parse(maze.gridData);
                    if (typeof size !== 'undefined') size = grid.length;
                    dessiner();
                } else {
                    if (typeof grid !== 'undefined') grid = [];
                    drawPlaceholder();
                }
            }, 50);
        }
    }

    // Sauvegarder (Création ou Mise à jour)
    mazeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const mazeData = {
            id: inputId.value ? parseInt(inputId.value) : Date.now(), // Fake ID pour mock
            name: inputName.value,
            difficulty: parseInt(inputDifficulty.value)
        };

        // 1. APPEL FANTÔME IPC - Protégé si window.api n'est pas encore prêt
        if (window.api && window.api.saveMaze) {
            await window.api.saveMaze(mazeData);
        }

        // 2. Simulation Locale
        if (inputId.value) {
            const index = labyrinthes.findIndex(m => m.id === mazeData.id);
            labyrinthes[index] = mazeData;
        } else {
            labyrinthes.push(mazeData);
        }

        switchView(viewDashboard);
        renderDashboard();
    });

    // Supprimer avec confirmation native
    async function requestDeleteMaze(id) {
        let shouldDelete = false;

        // APPEL FANTÔME IPC : Utiliser la boîte de dialogue native du système (Main Process)
        if (window.api && window.api.showMessageBox) {
            const result = await window.api.showMessageBox({
                type: 'warning',
                title: 'Confirmation de suppression',
                message: 'Êtes-vous sûr de vouloir supprimer ce labyrinthe définitivement ?',
                buttons: ['Annuler', 'Supprimer'],
                defaultId: 1,
                cancelId: 0
            });
            
            // result.response correspond à l'index du bouton cliqué
            shouldDelete = (result.response === 1);
        } else {
            // Fallback (mode navigateur pur si API non chargée)
            shouldDelete = confirm("Êtes-vous sûr de vouloir supprimer ce labyrinthe définitivement ?");
        }

        if (shouldDelete) {
            // APPEL FANTÔME IPC pour la suppression base de données
            if (window.api && window.api.deleteMaze) {
                await window.api.deleteMaze(id);
            }

            // Simulation Locale
            labyrinthes = labyrinthes.filter(m => m.id !== id);
            renderDashboard();
        }
    }

    // --- Gestion du Canvas (Algorithmes / Rendu) ---
    function drawPlaceholder() {
        const container = canvas.parentElement;
        // Rendre le canvas responsive (Math.max empêche les largeurs négatives si caché)
        canvas.width = Math.max(0, container.clientWidth - 40); 
        canvas.height = Math.max(0, container.clientHeight - 40);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Fond
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Texte
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '24px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Cliquez sur Générer', canvas.width / 2, canvas.height / 2);
    }

    // Redimensionnement dynamique de la fenêtre
    window.addEventListener('resize', () => {
        if(viewEditor.classList.contains('active')) {
            const container = canvas.parentElement;
            canvas.width = Math.max(0, container.clientWidth - 40); 
            canvas.height = Math.max(0, container.clientHeight - 40);
            
            // Si on a un labyrinthe en cours, on le redessine. Sinon on met le placeholder.
            if (typeof grid !== 'undefined' && grid.length > 0 && typeof dessiner === 'function') {
                dessiner();
            } else {
                drawPlaceholder();
            }
        }
    });

    // --- Écouteurs Mode Jeu et Actions Algorithmiques ---
    let isGameMode = false;
    window.stepsCount = 0; // Rendre global pour accès depuis labyrinth.js

    function toggleGameMode(forceQuit = false) {
        isGameMode = forceQuit ? false : !isGameMode; // Correction de la bascule (toggle)
        
        if (isGameMode) {
            window.stepsCount = 0;
            overlaySteps.textContent = `Nombre de pas : ${window.stepsCount}`;
            gameOverlay.style.display = 'flex';
            btnPlayMode.textContent = 'Quitter le Mode Jeu';
            btnPlayMode.classList.remove('btn-success');
            btnPlayMode.classList.add('btn-danger');
            
            // Initialiser la position du joueur et redessiner
            if (typeof playerPos !== 'undefined') {
                playerPos.x = 1;
                playerPos.y = 1;
            }
            if (typeof dessiner === 'function') {
                dessiner();
                if (typeof drawPlayer === 'function') {
                    drawPlayer();
                }
            }
        } else {
            gameOverlay.style.display = 'none';
            btnPlayMode.textContent = "Démarrer l'aventure (Mode Jeu)";
            btnPlayMode.classList.remove('btn-danger');
            btnPlayMode.classList.add('btn-success');
            
            // Réinitialiser la position du joueur au démarrage
            if (typeof playerPos !== 'undefined') {
                playerPos.x = 1;
                playerPos.y = 1;
            }
            // Fermer le modal de victoire s'il est ouvert
            const victoryModal = document.getElementById('victory-modal');
            if (victoryModal) {
                victoryModal.style.display = 'none';
            }
            if (typeof dessiner === 'function') {
                dessiner();
            }
        }
    }

    btnPlayMode.addEventListener('click', () => toggleGameMode(false));
    btnQuitGame.addEventListener('click', () => toggleGameMode(true));

    // Écouteur pour le bouton de continuation après victoire
    const btnVictoryContinue = document.getElementById('btn-victory-continue');
    if (btnVictoryContinue) {
        btnVictoryContinue.addEventListener('click', () => {
            const victoryModal = document.getElementById('victory-modal');
            if (victoryModal) {
                victoryModal.style.display = 'none';
                // Redessiner le labyrinthe pour continuer à jouer
                if (typeof dessiner === 'function') {
                    dessiner();
                    if (typeof drawPlayer === 'function') {
                        drawPlayer();
                    }
                }
            }
        });
    }

    // --- Écouteurs pour la Génération et Résolution du Labyrinthe ---
    btnGenerate.addEventListener('click', () => {
        const container = canvas.parentElement;
        canvas.width = Math.max(0, container.clientWidth - 40);
        canvas.height = Math.max(0, container.clientHeight - 40);
        generer();
    });

    btnSolve.addEventListener('click', () => {
        const container = canvas.parentElement;
        canvas.width = Math.max(0, container.clientWidth - 40);
        canvas.height = Math.max(0, container.clientHeight - 40);
        resoudre();
    });

    document.addEventListener('keydown', (e) => {
        if(!isGameMode || !viewEditor.classList.contains('active')) return;
        
        const key = e.key.toLowerCase();
        const validKeys = ['z', 'q', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
        
        if(validKeys.includes(key)) {
            e.preventDefault(); // Empêche le défilement de la page avec les flèches
            // Appel de la fonction de mouvement du joueur
            if (typeof movePlayer === 'function') {
                if (movePlayer(key)) {
                    window.stepsCount++;
                    overlaySteps.textContent = `Nombre de pas : ${window.stepsCount}`;
                }
            }
        }
    });

    // --- Administration (Vue et IPC Mocks pour la Personne A) ---
    function renderAdminStats() {
        statTotalMazes.textContent = labyrinthes.length; // Simulation
        statActiveUsers.textContent = mockUsers.length;
    }

    async function renderAdminUsers() {
        usersTableBody.innerHTML = '';
        
        // 1. APPEL FANTÔME IPC - Protégé
        let usersData = mockUsers;
        if (window.api && window.api.getAllUsers) {
            usersData = await window.api.getAllUsers();
        }

        usersData.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.username}</td>
                <td><span style="font-weight:${user.role === 'admin' ? 'bold' : 'normal'}">${user.role}</span></td>
                <td>${user.mazesCount}</td>
                <td>
                    ${user.role !== 'admin' ? `<button class="btn-danger btn-delete-user" data-id="${user.id}">Bannir</button>` : '-'}
                </td>
            `;
            usersTableBody.appendChild(tr);
        });

        // Écouteur pour la suppression des utilisateurs
        document.querySelectorAll('.btn-delete-user').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = parseInt(e.target.dataset.id);
                if (confirm("Voulez-vous vraiment bannir cet utilisateur ?")) {
                    // APPEL FANTÔME IPC
                    if (window.api && window.api.deleteUser) {
                        await window.api.deleteUser(userId);
                    }
                    // Simulation en local
                    mockUsers = mockUsers.filter(u => u.id !== userId);
                    renderAdminUsers();
                    renderAdminStats();
                }
            });
        });
    }
});
