let matchState = {
    p1: { points: 0, games: 0, sets: 0 },
    p2: { points: 0, games: 0, sets: 0 },
    isTieBreak: false,
    currentSet: 1,
    setsHistory: [],
    bestOf: 3,
    matchWinner: null
};

// Добавляем инициализацию Telegram Web App
//const tg = window.Telegram?.WebApp;
if (window.Telegram && window.Telegram.WebApp) {
  const tg = window.Telegram.WebApp;
  tg.ready(); // Говорим Telegram, что приложение готово
  tg.expand(); // Принудительно разворачиваем на весь экран
  
  // Блокируем закрытие приложения случайным свайпом
  tg.enableClosingConfirmation();
  
  // Обновляем viewport при изменении ориентации
  tg.onEvent('viewportChanged', tg.expand);
}

const pointValues = ['0', '15', '30', '40'];

// Модифицируем функции для сохранения состояния
function saveState() {
    try {
        localStorage.setItem('tennisScoreState', JSON.stringify(matchState));
    } catch(e) {
        console.error('Ошибка сохранения:', e);
    }
}

function loadState() {
    try {
        const saved = localStorage.getItem('tennisScoreState');
        if (saved) matchState = JSON.parse(saved);
    } catch(e) {
        console.error('Ошибка загрузки:', e);
    }
}


// Основные функции должны быть объявлены перед их использованием
function getScoreDisplay(current, opponent) {
  if (current >= 3 && opponent >= 3) {
    if (current === opponent) return 'Ровно';
    return current > opponent ? 'Больше' : 'Меньше'; // Более понятные обозначения
  }
  return ['0', '15', '30', '40'][current] || '40';
}

function checkGameWinner(player, opponent) {
    if (matchState.isTieBreak) {
        if ((player.points >= 7 && player.points - opponent.points >= 2) ||
            (player.points >= 6 && opponent.points >= 6 && Math.abs(player.points - opponent.points) === 2)) {
            return true;
        }
        return false;
    }
    
    if (player.points >= 4 && player.points - opponent.points >= 2) {
        return true;
    }
    return false;
}

function checkSetWinner(player, opponent) {
    if (matchState.isTieBreak) {
        const gamesDiff = player.games - opponent.games;
        return (player.games >= 7 && gamesDiff >= 2) || 
               (gamesDiff === 2 && player.games >= 6);
    }
    
    return (player.games >= 6 && player.games - opponent.games >= 2) ||
           player.games === 7;
}

function checkMatchWinner(player) {
    const requiredSets = Math.ceil(matchState.bestOf / 2);
    console.log(`Checking match winner: Player ${player === matchState.p1 ? 1 : 2} has ${player.sets} sets. Required: ${requiredSets}`);
    return player.sets >= requiredSets;
}

function resetPoints() {
    matchState.p1.points = 0;
    matchState.p2.points = 0;
}

function resetGames() {
    matchState.p1.games = 0;
    matchState.p2.games = 0;
    resetPoints();
}

function awardSet(player, opponent) {
    player.sets++;
    matchState.setsHistory.push({
        p1: matchState.p1.games,
        p2: matchState.p2.games
    });

    if (checkMatchWinner(player)) {
        matchState.matchWinner = player === matchState.p1 ? 1 : 2;
        alert(`Победитель: Игрок ${matchState.matchWinner}!`);
        updateDisplay();
        return true;
    }
    
    resetGames();
    matchState.currentSet++;
    matchState.isTieBreak = false;
    //alert(`Set ${matchState.currentSet - 1} won by ${player === matchState.p1 ? 'Player 1' : 'Player 2'}!`);
    return false;
}

function awardGame(player, opponent) {
    player.games++;
    resetPoints();

    if (checkSetWinner(player, opponent)) {
        if (!awardSet(player, opponent)) {
            //alert(`Сет ${matchState.currentSet - 1} выиграл ${player === matchState.p1 ? 'Игрок 1' : 'Игрок 2'}!`);
        }
    }

    if (matchState.p1.games === 6 && matchState.p2.games === 6) {
        matchState.isTieBreak = true;
    }
}

// Функции, вызываемые из HTML, должны быть объявлены глобально
function addPoint(playerNumber) {
    if (matchState.matchWinner !== null) return;
    
    const currentPlayer = playerNumber === 1 ? matchState.p1 : matchState.p2;
    const opponent = playerNumber === 1 ? matchState.p2 : matchState.p1;
    
    currentPlayer.points++;
    
    if (checkGameWinner(currentPlayer, opponent)) {
        awardGame(currentPlayer, opponent);
    }
    
    updateDisplay();
    saveState(); // Сохраняем после каждого изменения
}

function updateDisplay() {
     // Обновляем данные для обоих игроков через цикл
    [1, 2].forEach(playerNumber => {
        const player = playerNumber === 1 ? matchState.p1 : matchState.p2;
        const opponent = playerNumber === 1 ? matchState.p2 : matchState.p1;
        
        // Находим элементы по data-атрибутам
        const container = document.querySelector(`[data-player="${playerNumber}"]`);
        
        // Обновляем сеты
        container.querySelector('.sets-won').textContent = `Сеты: ${player.sets}`;
        
        // Обновляем геймы
        container.querySelector('.games-won').textContent = `Геймы: ${player.games}`;
        
        // Обновляем очки с учетом тай-брейка
        const pointsElement = container.querySelector('.current-score');
        if (matchState.isTieBreak) {
            pointsElement.textContent = player.points;
        } else {
            pointsElement.textContent = getScoreDisplay(player.points, opponent.points);
        }
    });

    // Блокируем кнопки добавления очков при завершении матча
    const pointButtons = document.querySelectorAll('[data-point-button]');
    pointButtons.forEach(btn => {
        btn.disabled = matchState.matchWinner !== null;
    });

    // Обновляем статус кнопки сброса
    document.querySelector('.reset-btn').disabled = false;
}

function changeMatchFormat(format) {
    if (confirm('Изменение формата игры приведет к сбросу очков текущего матча! Продолжить?')) {
        matchState.bestOf = parseInt(format);
        resetScore();
    } else {
        document.querySelector(`input[value="${matchState.bestOf}"]`).checked = true;
    }
}

function resetScore() {
    matchState.p1.points = 0;
    matchState.p2.points = 0;
    matchState.p1.games = 0;
    matchState.p2.games = 0;
    matchState.p1.sets = 0;
    matchState.p2.sets = 0;
    matchState.isTieBreak = false;
    matchState.currentSet = 1;
    matchState.setsHistory = [];
    matchState.matchWinner = null;
    updateDisplay();
    saveState(); // Сохраняем после сброса
}


// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    loadState(); // Загружаем сохраненное состояние
    updateDisplay();
    
    // Добавляем обработчики касаний
    document.querySelectorAll('button:not(.reset-btn)').forEach(btn => {
        btn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.click();
        });
    });
});