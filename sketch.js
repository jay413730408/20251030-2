// --- 關鍵變數 ---
let questionsTable; // 儲存 CSV 資料的 p5.Table 物件
let questions = []; // 儲存整理後的問題物件
let currentQuestionIndex = 0;
let score = 0;
let quizState = 'QUIZ'; // 狀態: 'QUIZ', 'RESULT'

// 選項按鈕與動畫相關
let options = [];
let selectedOption = null; // 儲存被選取的選項物件
let animationStartTime = 0; // 用於選項被選中時的特效計時

// 游標特效相關 (已禁用，但保留變數)
const TRAIL_LENGTH = 15;
let trailColor; 

// --- 載入資料 (CSV) ---
function preload() {
    // 必須使用 loadTable 載入 CSV 檔案
    questionsTable = loadTable('questions.csv', 'csv', 'header');
}

// --- 初始化設定 ---
function setup() {
    createCanvas(windowWidth, windowHeight);
    noStroke();
    textSize(24);
    textAlign(CENTER, CENTER);
    
    trailColor = color(255, 100, 100); 

    // 整理 CSV 資料
    for (let i = 0; i < questionsTable.getRowCount(); i++) {
        let row = questionsTable.getRow(i);
        questions.push({
            question: row.getString('question'),
            options: [
                row.getString('optionA'),
                row.getString('optionB'),
                row.getString('optionC')
            ],
            correct: row.getString('correct_answer')
        });
    }

    // 設置選項按鈕的初始位置
    setupOptions();
}

function setupOptions() {
    if (currentQuestionIndex >= questions.length) return;
    
    options = [];
    let startX = width / 2;
    let optionWidth = min(width * 0.6, 600); // 最大寬度 600
    let optionHeight = 60;
    let startY = height * 0.4;
    let padding = 20;

    for (let i = 0; i < questions[currentQuestionIndex].options.length; i++) {
        let y = startY + i * (optionHeight + padding);
        options.push({
            x: startX,
            y: y,
            w: optionWidth,
            h: optionHeight,
            text: questions[currentQuestionIndex].options[i],
            index: i
        });
    }
}


// --- 主要繪圖迴圈 ---
function draw() {
    background(240, 240, 255); // 淺藍色背景
    
    if (quizState === 'QUIZ') {
        drawQuizScreen();
    } else if (quizState === 'RESULT') {
        drawResultScreen();
    }
    
    // 游標邏輯處理 (現在只控制原生游標的類型)
    handleCursorStyle();
}

// --- 測驗畫面繪圖 ---
function drawQuizScreen() {
    // 繪製問題
    fill(50);
    textSize(32);
    text(questions[currentQuestionIndex].question, width / 2, height * 0.2);
    
    // 繪製選項
    for (let opt of options) {
        let fillColor = 255;
        let outlineColor = color(100);
        let currentW = opt.w;
        let currentH = opt.h;
        
        rectMode(CENTER);
        
        // 1. 選項選取特效 (滑鼠懸停)
        let isHover = isMouseOver(opt.x, opt.y, opt.w, opt.h);
        if (isHover && selectedOption === null) {
            fillColor = color(200, 200, 255); // 懸停時變色
            outlineColor = color(0, 0, 255); 
        }

        // 2. 被選中的選項動畫
        if (selectedOption && selectedOption.index === opt.index) {
            let elapsed = millis() - animationStartTime;
            let duration = 500; // 動畫持續 0.5 秒
            let t = constrain(elapsed / duration, 0, 1);
            
            // 脈衝放大效果：從 1.0 放大到 1.05 再回到 1.0
            let scaleFactor = 1.0 + 0.05 * sin(t * PI); 
            currentW = opt.w * scaleFactor; 
            currentH = opt.h * scaleFactor;
            
            // 答案揭曉顏色 (在動畫結束前)
            if (t >= 0.8) {
                let currentQuestion = questions[currentQuestionIndex];
                let isCorrect = (selectedOption.text === currentQuestion.correct);
                fillColor = isCorrect ? color(100, 255, 100) : color(255, 100, 100); 
            } else {
                fillColor = color(150, 150, 255); // 選中時的顏色
            }
            
            if (t >= 1) {
                // 動畫結束，檢查答案並跳到下一題
                checkAnswer(selectedOption.text);
            }
        }
        
        // 繪製按鈕
        fill(fillColor);
        stroke(outlineColor);
        strokeWeight(2);
        rect(opt.x, opt.y, currentW, currentH, 10); // 圓角矩形
        
        fill(50);
        noStroke();
        textSize(24);
        text(opt.text, opt.x, opt.y);
    }
}

// --- 結果畫面繪圖 ---
function drawResultScreen() {
    let percentage = score / questions.length;
    let message = '';
    let resultColor;

    // 根據成績產生不同動畫畫面
    if (percentage === 1.0) {
        message = "🎉 恭喜！滿分！你是個天才！";
        resultColor = color(255, 215, 0); // 金色
        drawPraiseAnimation(); 
    } else if (percentage >= 0.7) {
        message = `👍 幹得好！你答對了 ${score} 題！`;
        resultColor = color(0, 200, 0); // 綠色
        drawEncouragementAnimation(resultColor); 
    } else {
        message = `💪 繼續努力！你答對了 ${score} 題。`;
        resultColor = color(255, 100, 0); // 橙色
        drawEncouragementAnimation(resultColor); 
    }

    fill(50);
    textSize(40);
    text('測驗結果', width / 2, height * 0.1);
    textSize(30);
    text(message, width / 2, height * 0.3);
    
    // 繪製重試按鈕
    drawRestartButton();
}


// --- 互動與邏輯處理 ---
function mousePressed() {
    if (quizState === 'QUIZ') {
        if (selectedOption) return; // 如果正在播放動畫，則忽略點擊

        for (let opt of options) {
            if (isMouseOver(opt.x, opt.y, opt.w, opt.h)) {
                // 選取選項時的特效開始
                selectedOption = opt;
                animationStartTime = millis();
                return;
            }
        }
    } else if (quizState === 'RESULT') {
        // 點擊重試按鈕
        let btnX = width / 2;
        let btnY = height * 0.8;
        let btnW = 200;
        let btnH = 60;
        
        if (isMouseOver(btnX, btnY, btnW, btnH)) {
            resetQuiz();
        }
    }
}

function checkAnswer(selectedText) {
    if (selectedText === questions[currentQuestionIndex].correct) {
        score++;
    }

    // 延遲 1 秒後跳到下一題或結果畫面
    setTimeout(() => {
        currentQuestionIndex++;
        selectedOption = null; // 重置選取狀態
        if (currentQuestionIndex < questions.length) {
            setupOptions(); // 設置下一題的選項
        } else {
            quizState = 'RESULT';
        }
    }, 1000); 
}

function resetQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    quizState = 'QUIZ';
    setupOptions();
}

function isMouseOver(x, y, w, h) {
    // 檢查滑鼠是否在以 (x, y) 為中心的矩形內
    return mouseX > x - w / 2 && mouseX < x + w / 2 &&
           mouseY > y - h / 2 && mouseY < y + h / 2;
}

// --- 游標樣式處理 (取代 drawCustomCursor) ---
function handleCursorStyle() {
    let isHand = false;
    
    if (quizState === 'QUIZ') {
        for (let opt of options) {
             if (isMouseOver(opt.x, opt.y, opt.w, opt.h) && selectedOption === null) {
                isHand = true;
                break;
            }
        }
    } else if (quizState === 'RESULT') {
        let btnX = width / 2;
        let btnY = height * 0.8;
        let btnW = 200;
        let btnH = 60;
        if (isMouseOver(btnX, btnY, btnW, btnH)) {
            isHand = true;
        }
    }
    
    // 根據是否懸停在可點擊區域切換原生游標
    if (isHand) {
        cursor(HAND); 
    } else {
        // 恢復為預設箭頭游標
        cursor(ARROW); 
    }
}

// --- 成績回饋動畫：滿分 (稱讚) ---
function drawPraiseAnimation() {
    // 星星雨和彩帶效果
    
    // 1. 旋轉星星雨
    let starColor = color(255, 215, 0); // 金色
    for (let i = 0; i < 50; i++) {
        let x = width / 2 + cos(i + frameCount * 0.02) * random(width/3);
        let y = height / 2 + sin(i + frameCount * 0.02) * random(height/3);
        let size = random(10, 30);
        
        let brightness = map(sin(frameCount * 0.1 + i * 0.5), -1, 1, 150, 255);
        fill(starColor, brightness);
        
        push();
        translate(x, y);
        rotate(frameCount * 0.05);
        drawStar(0, 0, size / 2, size, 5); 
        pop();
    }
    
    // 2. 彩帶 (Confetti)
    for (let i = 0; i < 20; i++) {
        let x = random(width);
        // 彩帶從上方落下
        let y = (frameCount * 5 + i * 50) % (height + 50); 
        let c = color(random(255), random(255), random(255));
        
        fill(c);
        noStroke();
        rect(x, y, 10, 10);
    }
}

// 繪製星星的輔助函式
function drawStar(x, y, radius1, radius2, npoints) {
    let angle = TWO_PI / npoints;
    let halfAngle = angle / 2.0;
    beginShape();
    for (let a = 0; a < TWO_PI; a += angle) {
        let sx = x + cos(a) * radius2;
        let sy = y + sin(a) * radius2;
        vertex(sx, sy);
        sx = x + cos(a + halfAngle) * radius1;
        sy = y + sin(a + halfAngle) * radius1;
        vertex(sx, sy);
    }
    endShape(CLOSE);
}

// --- 成績回饋動畫：鼓勵/一般 ---
function drawEncouragementAnimation(c) {
    // 脈衝光環與波紋
    
    // 1. 中心脈衝光環
    let radius = map(sin(frameCount * 0.05), -1, 1, 100, 250); // 半徑隨時間變化
    let alpha = map(sin(frameCount * 0.05), -1, 1, 30, 100);
    
    fill(red(c), green(c), blue(c), alpha);
    noStroke();
    ellipse(width / 2, height / 2, radius * 2, radius * 2);
    
    // 2. 鼓勵文字周圍的波紋
    for (let i = 0; i < 3; i++) {
        // 半徑隨著時間和 i 擴散
        let r = (frameCount * 2 + i * 100) % 400; 
        let currentAlpha = map(r, 0, 400, 200, 0); // 擴散時透明度降低
        
        stroke(red(c), green(c), blue(c), currentAlpha);
        noFill();
        strokeWeight(4);
        ellipse(width / 2, height * 0.3, r, r);
    }
}

function drawRestartButton() {
    let btnX = width / 2;
    let btnY = height * 0.8;
    let btnW = 200;
    let btnH = 60;
    
    let fillColor = color(100, 100, 255); // 藍色
    
    if (isMouseOver(btnX, btnY, btnW, btnH)) {
        // 按鈕懸停特效
        fillColor = color(150, 150, 255);
    } 
    
    rectMode(CENTER);
    fill(fillColor);
    rect(btnX, btnY, btnW, btnH, 10);
    
    fill(255);
    textSize(28);
    text('重新測驗', btnX, btnY);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    setupOptions(); // 重新計算選項位置
}