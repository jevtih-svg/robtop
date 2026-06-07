/* RobTop — модуль «Угадай число». Математический пример на время: ответ — число от 1 до 10.
   На пример даётся 20 секунд (таймер-кольцо). Тап по числу 1–10 — оно подсвечивается и
   показывается в кружке сверху; отгадал +10 очков, не отгадал −5, не успел −5 (sdk.points).
   Примеры: пул из 1000 предгенерированных (проверены, сложность 4-го класса) + встроенный
   генератор того же уровня, когда пул закончится. Указатель текущего примера — в meta.exIdx
   (generic-стор), раунды — в коллекции rounds (история + статистика).
   Тексты — sdk.t/sdk.formatDate (en/ru/lv); словарь — MESSAGES ниже. */
(function(){
  "use strict";

  /* =================== ЛОКАЛИЗАЦИЯ (en/ru/lv) =================== */
  var MESSAGES={
    en:{ guess:{
      subtitle:"Timed math: the answer is 1 to 10",
      hudLeft:"🎯 <b>guess</b>", hudCLbl:"guessed", hudRLbl:"points",
      startTitle:"Guess the number!", startHint:"Solve the example — the answer is from 1 to 10. You have {s} seconds!",
      startBtn:"Play", pickHint:"Tap the answer!",
      resWin:"Guessed it! +10", resWrong:"Not this time… −5", resTimeout:"Time's up! −5",
      correctIs:"The answer was {n}", nextBtn:"Next",
      legWin:"guessed +10", legWrong:"wrong −5", legTimeout:"too late −5",
      historyTitle:"My rounds", historyEmpty:"No rounds yet. Tap “Play”!",
      filterAll:"All", filterWin:"Guessed", filterWrong:"Wrong", filterTimeout:"Too late",
      badgeWin:"Guessed", badgeWrong:"Wrong", badgeTimeout:"Too late",
      histPicked:"tapped {n}",
      statsTitle:"Guessing stats", statTotal:"rounds total", statWin:"guessed", statWrong:"wrong", statTimeout:"too late",
      parentNote:"The child solves the examples. You're viewing.",
      saveFailed:"Couldn't save", unit:"sec",
      aria:{ stats:"Stats", answer:"Answer {n}", timeLeft:"{n} seconds left" }
    }},
    ru:{ guess:{
      subtitle:"Примеры на время: ответ от 1 до 10",
      hudLeft:"🎯 <b>угадайка</b>", hudCLbl:"отгадано", hudRLbl:"очки",
      startTitle:"Угадай число!", startHint:"Реши пример — ответ от 1 до 10. На пример даётся {s} секунд!",
      startBtn:"Играть", pickHint:"Нажми правильный ответ!",
      resWin:"Отгадал! +10", resWrong:"Не отгадал… −5", resTimeout:"Не успел! −5",
      correctIs:"Правильный ответ: {n}", nextBtn:"Дальше",
      legWin:"отгадал +10", legWrong:"не отгадал −5", legTimeout:"не успел −5",
      historyTitle:"Мои примеры", historyEmpty:"Примеров пока нет. Нажми «Играть»!",
      filterAll:"Все", filterWin:"Отгадал", filterWrong:"Не отгадал", filterTimeout:"Не успел",
      badgeWin:"Отгадал", badgeWrong:"Не отгадал", badgeTimeout:"Не успел",
      histPicked:"нажал {n}",
      statsTitle:"Статистика угадайки", statTotal:"всего примеров", statWin:"отгадал", statWrong:"не отгадал", statTimeout:"не успел",
      parentNote:"Примеры решает ребёнок. Это просмотр.",
      saveFailed:"Не удалось сохранить", unit:"сек",
      aria:{ stats:"Статистика", answer:"Ответ {n}", timeLeft:"Осталось {n} сек" }
    }},
    lv:{ guess:{
      subtitle:"Matemātika uz laiku: atbilde no 1 līdz 10",
      hudLeft:"🎯 <b>minēšana</b>", hudCLbl:"uzminēts", hudRLbl:"punkti",
      startTitle:"Uzmini skaitli!", startHint:"Atrisini piemēru — atbilde ir no 1 līdz 10. Tev ir {s} sekundes!",
      startBtn:"Spēlēt", pickHint:"Nospied pareizo atbildi!",
      resWin:"Uzminēji! +10", resWrong:"Šoreiz ne… −5", resTimeout:"Laiks beidzās! −5",
      correctIs:"Pareizā atbilde: {n}", nextBtn:"Tālāk",
      legWin:"uzminēts +10", legWrong:"nepareizi −5", legTimeout:"nepaspēja −5",
      historyTitle:"Mani piemēri", historyEmpty:"Piemēru vēl nav. Nospied “Spēlēt”!",
      filterAll:"Visi", filterWin:"Uzminēts", filterWrong:"Nepareizi", filterTimeout:"Nepaspēja",
      badgeWin:"Uzminēts", badgeWrong:"Nepareizi", badgeTimeout:"Nepaspēja",
      histPicked:"nospieda {n}",
      statsTitle:"Minēšanas statistika", statTotal:"piemēri kopā", statWin:"uzminēts", statWrong:"nepareizi", statTimeout:"nepaspēja",
      parentNote:"Piemērus risina bērns. Šis ir skats.",
      saveFailed:"Neizdevās saglabāt", unit:"sek",
      aria:{ stats:"Statistika", answer:"Atbilde {n}", timeLeft:"Atlikušas {n} sekundes" }
    }}
  };

  var ROUND_SECONDS=20;
  var RING_C=2*Math.PI*20; // длина окружности таймера (r=20)
  var BACK_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  var STATS_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 20v-6M12 20V8M19 20V4"/></svg>';

  /* =================== ПУЛ ПРИМЕРОВ ===================
     1000 предгенерированных примеров [выражение, ответ 1..10], сложность 4-го класса,
     каждый проверен программно (целочисленность делений, ответ 1..10). Порядок перемешан.
     Сгенерированы шаблонами genOne() ниже (seed 20260607). */
var POOL=[
  ["3000 : 1000 + 3",6],["8 × 6 : 48",1],["31 − 6 × 5",1],["5500 : 500 − 1",10],["(46 − 19) : 9",3],
  ["(43 − 13) : 6",5],["82 − 9 × 9",1],["1800 : 600 + 1",4],["(11 + 19) : 6",5],["49 − 8 × 6",1],
  ["4 × 9 : 18",2],["3 + 80 : 40",5],["5 + 1800 : 900",7],["15 − 640 : 80",7],["8 × 7 : 56",1],
  ["2 + 600 : 200",5],["(30 + 14) : 11",4],["10 − 3 × 3",1],["3 × 12 : 6",6],["2100 : 700 + 1",4],
  ["14 − 630 : 90",7],["(67 − 40) : 9",3],["(115 − 55) : 12",5],["12 − 240 : 60",8],["(57 − 33) : 12",2],
  ["10 − 1400 : 200",3],["48 − 8 × 5",8],["43 − 8 × 5",3],["(29 − 17) : 6",2],["(75 − 53) : 11",2],
  ["5500 : 500 − 3",8],["(19 + 29) : 6",8],["(19 + 77) : 12",8],["(62 + 38) : 10",10],["2400 : 600 + 2",6],
  ["360 : 60 + 4",10],["8 − 160 : 80",6],["(12 + 33) : 9",5],["3 + 2400 : 800",6],["37 − 4 × 8",5],
  ["2100 : 700 − 2",1],["1200 : 400 + 1",4],["6 × 8 : 16",3],["13 − 180 : 30",7],["33 − 4 × 7",5],
  ["68 − 7 × 9",5],["12 − 630 : 90",5],["(71 − 63) : 8",1],["(91 − 55) : 6",6],["(25 + 23) : 6",8],
  ["4800 : 400 − 5",7],["320 : 80 − 3",1],["11 − 7000 : 1000",4],["240 : 20 − 2",10],["3 × 12 : 36",1],
  ["900 : 300 + 1",4],["11 − 300 : 60",6],["(93 − 39) : 9",6],["10 − 560 : 70",2],["7 − 480 : 80",1],
  ["1 + 4500 : 900",6],["16 − 3 × 4",4],["360 : 30 − 2",10],["13 − 1600 : 400",9],["20 − 4 × 4",4],
  ["43 − 5 × 8",3],["8 × 9 : 24",3],["15 − 1000 : 200",10],["12 − 2400 : 300",4],["3000 : 500 + 1",7],
  ["6 − 360 : 90",2],["14 − 5400 : 600",5],["11 − 3 × 3",2],["16 − 640 : 80",8],["14 − 800 : 200",10],
  ["1200 : 200 + 2",8],["62 − 9 × 6",8],["46 − 4 × 9",10],["270 : 90 − 1",2],["56 − 7 × 7",7],
  ["2 + 3000 : 1000",5],["17 − 8000 : 1000",9],["5 + 2000 : 400",10],["(79 + 11) : 10",9],["11 − 360 : 40",2],
  ["160 : 80 + 4",6],["7700 : 700 − 4",7],["(96 − 72) : 6",4],["(127 − 92) : 7",5],["34 − 8 × 4",2],
  ["29 − 3 × 9",2],["350 : 50 − 1",6],["(23 + 43) : 11",6],["7 × 10 : 70",1],["17 − 3500 : 500",10],
  ["320 : 80 + 2",6],["1 + 160 : 80",3],["11 − 3000 : 600",6],["24 − 6 × 3",6],["(22 + 68) : 9",10],
  ["1600 : 400 + 4",8],["(14 + 22) : 9",4],["12 × 5 : 6",10],["6000 : 600 − 5",5],["2 + 2700 : 900",5],
  ["(97 − 47) : 10",5],["7 − 350 : 70",2],["23 − 5 × 3",8],["100 : 50 + 4",6],["10 − 4800 : 600",2],
  ["15 − 630 : 90",8],["(79 − 37) : 6",7],["10800 : 900 − 3",9],["2000 : 1000 + 1",3],["3500 : 500 − 1",6],
  ["220 : 20 − 2",9],["10 − 120 : 20",4],["18 − 540 : 60",9],["550 : 50 − 3",8],["4 − 400 : 200",2],
  ["39 − 5 × 6",9],["(11 + 16) : 9",3],["62 − 8 × 7",6],["3000 : 500 − 4",2],["60 : 30 × 4",8],
  ["(15 + 41) : 7",8],["10 × 12 : 40",3],["4 − 90 : 30",1],["9 × 12 : 54",2],["(71 − 17) : 6",9],
  ["43 − 7 × 5",8],["10 − 1200 : 300",6],["5 + 3200 : 800",9],["47 − 8 × 5",7],["7 − 40 : 20",5],
  ["6300 : 700 − 4",5],["350 : 50 − 5",2],["11 − 3500 : 500",4],["3 + 140 : 20",10],["800 : 200 − 3",1],
  ["5400 : 900 + 1",7],["32 − 6 × 4",8],["20 − 3 × 5",5],["(133 − 67) : 11",6],["1000 : 200 − 3",2],
  ["600 : 300 + 2",4],["9000 : 900 − 1",9],["(128 − 47) : 9",9],["29 − 4 × 6",5],["180 : 20 − 2",7],
  ["(118 − 78) : 8",5],["6600 : 600 − 3",8],["8 − 480 : 80",2],["3500 : 700 × 2",10],["900 : 90 − 1",9],
  ["4400 : 400 − 4",7],["6 + 4000 : 1000",10],["13 − 3600 : 900",9],["10 − 1000 : 500",8],["57 − 7 × 8",1],
  ["60 − 8 × 7",4],["7000 : 1000 + 2",9],["2700 : 900 × 3",9],["(100 − 52) : 8",6],["4 × 6 : 12",2],
  ["13 − 5000 : 1000",8],["250 : 50 × 2",10],["60 : 30 + 1",3],["(60 − 48) : 6",2],["160 : 40 + 2",6],
  ["6 × 8 : 24",2],["120 : 40 − 1",2],["10 − 2500 : 500",5],["1000 : 500 − 1",1],["80 : 40 + 5",7],
  ["3 − 2000 : 1000",1],["13 − 4000 : 1000",9],["13 − 1600 : 200",5],["(15 + 25) : 10",4],["65 − 9 × 7",2],
  ["360 : 90 + 1",5],["(65 − 54) : 11",1],["(164 − 87) : 11",7],["(102 − 21) : 9",9],["550 : 50 − 6",5],
  ["1 + 1000 : 500",3],["65 − 7 × 9",2],["(22 + 42) : 8",8],["(17 + 63) : 8",10],["1080 : 90 − 3",9],
  ["2 + 1400 : 700",4],["240 : 80 − 2",1],["26 − 4 × 5",6],["1 + 2000 : 500",5],["9 − 1000 : 500",7],
  ["(125 − 53) : 8",9],["800 : 400 × 5",10],["32 − 4 × 7",4],["(147 − 39) : 12",9],["42 − 4 × 9",6],
  ["14 − 6300 : 900",7],["7 × 5 − 9 × 3",8],["5 × 11 : 55",1],["1 + 2400 : 800",4],["(17 + 55) : 12",6],
  ["14 − 200 : 50",10],["160 : 80 + 1",3],["28 − 4 × 6",4],["(54 − 45) : 9",1],["13 − 4500 : 500",4],
  ["4 − 120 : 40",1],["80 : 40 + 6",8],["10 − 4000 : 500",2],["(31 + 49) : 10",8],["(15 + 25) : 8",5],
  ["180 : 60 − 2",1],["(74 − 26) : 8",6],["(23 + 40) : 7",9],["(43 + 13) : 8",7],["10 − 4800 : 800",4],
  ["(105 − 97) : 8",1],["14 − 120 : 20",8],["63 − 9 × 6",9],["4200 : 600 − 6",1],["770 : 70 − 1",10],
  ["3000 : 1000 − 1",2],["1 + 100 : 50",3],["(64 − 34) : 10",3],["23 − 4 × 5",3],["22 − 3 × 6",4],
  ["1800 : 600 + 4",7],["(114 − 50) : 8",8],["200 : 20 − 5",5],["11 − 1800 : 200",2],["11 − 1400 : 700",9],
  ["320 : 40 − 6",2],["9 × 3 − 4 × 6",3],["12 − 270 : 30",3],["31 − 3 × 9",4],["500 : 50 − 6",4],
  ["12 − 2500 : 500",7],["(119 − 59) : 6",10],["(34 + 47) : 9",9],["(140 − 77) : 9",7],["9 − 60 : 20",6],
  ["(86 + 14) : 10",10],["32 − 5 × 6",2],["(183 − 93) : 9",10],["12 − 100 : 20",7],["(127 − 43) : 12",7],
  ["5600 : 800 − 6",1],["100 : 20 − 1",4],["3 + 400 : 200",5],["35 − 3 × 9",8],["1200 : 300 + 4",8],
  ["1800 : 900 + 4",6],["270 : 30 − 3",6],["40 − 8 × 4",8],["61 − 9 × 6",7],["(104 − 95) : 9",1],
  ["1600 : 400 − 2",2],["2500 : 500 + 3",8],["7 − 100 : 20",2],["(147 − 63) : 12",7],["660 : 60 − 1",10],
  ["4200 : 600 + 3",10],["67 − 7 × 9",4],["(104 − 80) : 6",4],["(107 − 37) : 10",7],["50 − 7 × 6",8],
  ["78 − 8 × 9",6],["5400 : 900 + 2",8],["19 − 3 × 5",4],["720 : 60 − 6",6],["12 − 2100 : 300",5],
  ["210 : 30 − 5",2],["12000 : 1000 − 3",9],["8 − 180 : 90",6],["12 − 2700 : 300",3],["3200 : 800 + 3",7],
  ["44 − 7 × 6",2],["7 − 250 : 50",2],["8 − 90 : 30",5],["100 : 50 + 1",3],["(29 + 19) : 6",8],
  ["(34 + 32) : 11",6],["3 + 5400 : 900",9],["8 − 60 : 20",5],["(90 − 13) : 11",7],["1000 : 500 + 5",7],
  ["(23 + 31) : 6",9],["2 + 1600 : 800",4],["440 : 40 − 3",8],["(115 − 73) : 6",7],["80 : 40 + 4",6],
  ["480 : 80 + 1",7],["6 × 6 − 7 × 4",8],["2800 : 400 − 6",1],["46 − 5 × 8",6],["4000 : 1000 × 2",8],
  ["11 − 540 : 60",2],["(133 − 84) : 7",7],["1400 : 700 + 2",4],["11 − 320 : 40",3],["2800 : 700 + 2",6],
  ["(12 + 98) : 11",10],["74 − 8 × 9",2],["(115 − 88) : 9",3],["400 : 40 − 1",9],["600 : 200 + 6",9],
  ["(110 − 74) : 9",4],["13 − 4800 : 600",5],["(98 − 66) : 8",4],["80 : 40 × 4",8],["6000 : 1000 − 2",4],
  ["25 − 8 × 3",1],["8 + 400 : 200",10],["(63 − 45) : 6",3],["9000 : 900 − 6",4],["(18 + 15) : 11",3],
  ["240 : 60 + 3",7],["33 − 3 × 9",6],["39 − 5 × 7",4],["3 + 1800 : 900",5],["1400 : 700 × 4",8],
  ["2400 : 800 + 2",5],["3500 : 500 + 2",9],["(58 − 25) : 11",3],["12 × 11 : 22",6],["2100 : 700 + 2",5],
  ["8 × 5 − 4 × 9",4],["(46 + 17) : 7",9],["4 × 4 : 8",2],["48 − 6 × 7",6],["11 − 100 : 20",6],
  ["(115 − 25) : 10",9],["25 − 6 × 3",7],["1 + 3600 : 600",7],["(26 + 34) : 10",6],["(85 − 45) : 10",4],
  ["59 − 7 × 8",3],["1200 : 600 + 3",5],["14 − 350 : 50",7],["(40 + 68) : 12",9],["(91 − 81) : 10",1],
  ["17 − 540 : 60",8],["6600 : 600 − 1",10],["2 + 40 : 20",4],["90 − 9 × 9",9],["4 × 7 − 5 × 4",8],
  ["28 − 5 × 4",8],["9 − 180 : 30",3],["(47 − 41) : 6",1],["320 : 40 + 1",9],["31 − 4 × 6",7],
  ["64 − 9 × 6",10],["(80 − 14) : 11",6],["400 : 80 × 2",10],["6 − 4000 : 800",1],["480 : 60 − 6",2],
  ["(113 − 49) : 8",8],["17 − 4 × 4",1],["41 − 8 × 5",1],["6 + 1800 : 600",9],["17 − 180 : 20",8],
  ["5600 : 800 − 1",6],["(50 + 30) : 8",10],["5 − 80 : 40",3],["6 − 2400 : 800",3],["16 − 630 : 90",9],
  ["(109 − 46) : 7",9],["1 + 1600 : 400",5],["840 : 70 − 6",6],["4 + 120 : 60",6],["3300 : 300 − 2",9],
  ["4 − 180 : 90",2],["2000 : 400 + 4",9],["(16 + 12) : 7",4],["180 : 60 + 4",7],["(72 − 64) : 8",1],
  ["60 : 20 + 1",4],["240 : 40 − 1",5],["24 − 3 × 5",9],["240 : 80 + 4",7],["140 : 70 + 7",9],
  ["(109 − 91) : 6",3],["33 − 4 × 6",9],["640 : 80 − 5",3],["9 × 3 − 6 × 4",3],["(11 + 53) : 8",8],
  ["600 : 200 + 4",7],["(21 + 59) : 8",10],["(24 + 11) : 7",5],["10 × 7 : 35",2],["4800 : 800 + 2",8],
  ["2 + 270 : 90",5],["44 − 5 × 8",4],["54 − 7 × 7",5],["17 − 4000 : 500",9],["33 − 4 × 8",1],
  ["6 × 10 : 60",1],["(163 − 53) : 11",10],["60 − 6 × 9",6],["6 − 160 : 40",2],["(64 − 24) : 10",4],
  ["450 : 90 + 3",8],["(56 + 34) : 9",10],["58 − 7 × 7",9],["59 − 8 × 7",3],["25 − 5 × 4",5],
  ["(106 − 50) : 8",7],["2400 : 800 − 2",1],["4 + 2500 : 500",9],["(18 + 32) : 10",5],["(25 + 35) : 12",5],
  ["(22 + 14) : 9",4],["17 − 240 : 30",9],["(39 + 15) : 6",9],["(31 + 17) : 6",8],["(111 − 99) : 6",2],
  ["9000 : 1000 − 1",8],["10800 : 900 − 2",10],["2 + 450 : 90",7],["(84 − 34) : 10",5],["32 − 6 × 5",2],
  ["1 + 2000 : 1000",3],["3 + 160 : 80",5],["15 − 2800 : 400",8],["15 − 4500 : 500",6],["3 × 6 : 18",1],
  ["(78 + 12) : 9",10],["(83 − 38) : 9",5],["(41 − 31) : 10",1],["12 − 560 : 80",5],["11000 : 1000 − 1",10],
  ["2 + 420 : 60",9],["(27 + 36) : 9",7],["65 − 8 × 7",9],["(45 + 11) : 7",8],["2400 : 800 + 3",6],
  ["900 : 300 − 1",2],["21 − 4 × 4",5],["(51 − 37) : 7",2],["4 − 1500 : 500",1],["2 + 3500 : 700",7],
  ["4200 : 700 − 4",2],["35 − 4 × 8",3],["10 − 1800 : 300",4],["3 − 1000 : 500",1],["320 : 80 + 4",8],
  ["11 − 450 : 50",2],["2800 : 700 − 3",1],["46 − 6 × 6",10],["22 − 4 × 4",6],["5 − 1200 : 600",3],
  ["2 + 120 : 60",4],["4000 : 400 − 3",7],["(15 + 21) : 6",6],["(58 − 49) : 9",1],["18 − 270 : 30",9],
  ["2 + 60 : 30",4],["(99 − 45) : 6",9],["350 : 70 + 2",7],["30 − 7 × 3",9],["6400 : 800 + 2",10],
  ["16 − 420 : 70",10],["57 − 9 × 6",3],["320 : 40 + 2",10],["(39 + 15) : 9",6],["6600 : 600 − 2",9],
  ["21 − 5 × 3",6],["(49 + 11) : 12",5],["(15 + 29) : 11",4],["420 : 70 − 3",3],["6000 : 1000 + 4",10],
  ["200 : 20 − 4",6],["2 + 800 : 200",6],["57 − 6 × 9",3],["54 − 9 × 5",9],["350 : 70 × 2",10],
  ["8 − 3000 : 1000",5],["12 × 6 : 9",8],["(59 + 29) : 11",8],["23 − 6 × 3",5],["(25 − 15) : 10",1],
  ["13 − 1200 : 400",10],["9 − 6400 : 800",1],["5 × 12 : 6",10],["8 − 7000 : 1000",1],["10 × 9 : 45",2],
  ["3600 : 400 − 6",3],["1400 : 200 − 1",6],["3000 : 500 − 5",1],["450 : 90 − 3",2],["(13 + 37) : 10",5],
  ["(91 − 67) : 8",3],["19 − 5400 : 600",10],["8 × 11 : 88",1],["(108 − 72) : 12",3],["6 + 210 : 70",9],
  ["1500 : 300 − 1",4],["(54 + 42) : 12",8],["4400 : 400 − 3",8],["28 − 7 × 3",7],["450 : 90 + 2",7],
  ["3500 : 500 − 2",5],["3 − 80 : 40",1],["(61 + 11) : 12",6],["4 + 2800 : 700",8],["630 : 90 − 5",2],
  ["10 − 3000 : 500",4],["1 + 6000 : 1000",7],["4000 : 400 − 2",8],["5000 : 1000 + 3",8],["14 − 3 × 3",5],
  ["(94 − 76) : 6",3],["(106 − 43) : 7",9],["(62 − 22) : 8",5],["(83 − 77) : 6",1],["17 − 270 : 30",8],
  ["6 − 1000 : 200",1],["240 : 40 − 5",1],["(77 − 17) : 12",5],["600 : 300 + 1",3],["28 − 3 × 7",7],
  ["(113 − 65) : 8",6],["10 × 10 : 50",2],["(68 + 22) : 10",9],["1 + 400 : 200",3],["(121 − 65) : 8",7],
  ["300 : 30 − 6",4],["4900 : 700 − 5",2],["8 − 5400 : 900",2],["(28 + 12) : 10",4],["64 − 8 × 7",8],
  ["(119 − 56) : 9",7],["2000 : 400 − 2",3],["56 − 6 × 9",2],["330 : 30 − 1",10],["10 − 420 : 60",3],
  ["1 + 540 : 90",7],["(103 − 81) : 11",2],["(81 − 45) : 6",6],["6000 : 600 − 3",7],["(82 − 58) : 8",3],
  ["2400 : 800 − 1",2],["6 − 600 : 200",3],["1000 : 500 + 1",3],["990 : 90 − 5",6],["(132 − 32) : 10",10],
  ["8 × 3 : 6",4],["(125 − 97) : 7",4],["(82 + 18) : 10",10],["240 : 20 − 4",8],["1 + 4000 : 1000",5],
  ["3 − 120 : 60",1],["12 − 40 : 20",10],["4400 : 400 − 1",10],["300 : 30 − 2",8],["250 : 50 − 3",2],
  ["210 : 70 × 2",6],["35 − 4 × 7",7],["79 − 8 × 9",7],["(96 − 88) : 8",1],["60 : 30 × 3",6],
  ["(167 − 67) : 10",10],["160 : 20 − 3",5],["(91 − 71) : 10",2],["12 − 420 : 70",6],["9 − 150 : 50",6],
  ["3 + 2400 : 600",7],["3 − 180 : 90",1],["80 : 20 + 1",5],["4500 : 900 − 3",2],["360 : 60 − 4",2],
  ["300 : 50 + 1",7],["5 + 150 : 50",8],["5 × 9 − 8 × 5",5],["6400 : 800 − 2",6],["9 − 3000 : 1000",6],
  ["2100 : 300 − 1",6],["(16 + 14) : 6",5],["8 − 200 : 50",4],["1600 : 400 × 2",8],["(118 − 85) : 11",3],
  ["27 − 6 × 3",9],["210 : 70 + 2",5],["11 − 8100 : 900",2],["71 − 9 × 7",8],["12 × 9 : 54",2],
  ["(23 + 25) : 6",8],["(30 − 21) : 9",1],["(94 − 14) : 8",10],["(79 − 43) : 9",4],["280 : 70 − 2",2],
  ["7 − 5000 : 1000",2],["35 − 5 × 5",10],["31 − 3 × 8",7],["1 + 600 : 300",3],["37 − 5 × 7",2],
  ["3200 : 800 + 2",6],["(36 + 30) : 11",6],["(40 + 14) : 6",9],["(34 + 36) : 7",10],["(68 + 52) : 12",10],
  ["7 − 5400 : 900",1],["12 − 540 : 90",6],["(31 − 25) : 6",1],["15 − 180 : 30",9],["5 + 40 : 20",7],
  ["(89 − 17) : 8",9],["(17 + 31) : 8",6],["450 : 50 + 1",10],["420 : 70 + 1",7],["(100 − 51) : 7",7],
  ["500 : 50 − 3",7],["50 − 5 × 9",5],["12 − 810 : 90",3],["600 : 200 + 3",6],["3600 : 900 + 1",5],
  ["180 : 90 × 3",6],["6 × 4 : 12",2],["11 − 360 : 90",7],["1 + 1800 : 900",3],["(39 − 15) : 12",2],
  ["6400 : 800 − 4",4],["2 + 210 : 70",5],["43 − 7 × 6",1],["420 : 60 − 2",5],["360 : 40 − 3",6],
  ["5 + 120 : 40",8],["1200 : 400 + 3",6],["(46 − 22) : 8",3],["(33 + 37) : 7",10],["76 − 9 × 8",4],
  ["120 : 60 + 7",9],["360 : 90 − 3",1],["30 − 3 × 9",3],["32 − 4 × 6",8],["(59 − 35) : 12",2],
  ["2 + 720 : 90",10],["8 − 150 : 30",3],["640 : 80 − 3",5],["5 × 10 : 50",1],["2700 : 300 − 3",6],
  ["13 − 810 : 90",4],["1 + 180 : 90",3],["13 − 90 : 30",10],["600 : 300 + 7",9],["(154 − 82) : 8",9],
  ["4000 : 400 − 1",9],["5 − 180 : 60",2],["14 − 1600 : 400",10],["41 − 7 × 5",6],["7 + 80 : 40",9],
  ["210 : 70 − 1",2],["(123 − 33) : 10",9],["10000 : 1000 − 4",6],["160 : 80 + 2",4],["2500 : 500 + 4",9],
  ["1600 : 400 − 3",1],["400 : 80 − 3",2],["(96 − 64) : 8",4],["(56 + 32) : 11",8],["59 − 7 × 7",10],
  ["(113 − 33) : 8",10],["15 − 4200 : 600",8],["49 − 5 × 9",4],["64 − 9 × 7",1],["9 × 4 : 12",3],
  ["210 : 70 + 4",7],["(43 + 47) : 10",9],["(29 + 67) : 12",8],["1 + 140 : 70",3],["58 − 8 × 7",2],
  ["13 − 120 : 40",10],["3 × 10 : 15",2],["18 − 320 : 40",10],["(162 − 54) : 12",9],["(47 − 29) : 9",2],
  ["(84 − 76) : 8",1],["(105 − 99) : 6",1],["10 − 300 : 60",5],["81 − 8 × 9",9],["26 − 5 × 5",1],
  ["(15 + 12) : 9",3],["(89 − 17) : 12",6],["9000 : 900 − 3",7],["120 : 60 + 3",5],["(136 − 76) : 10",6],
  ["(23 + 13) : 9",4],["700 : 70 − 1",9],["5 × 3 : 15",1],["52 − 9 × 5",7],["64 − 7 × 9",1],
  ["(63 + 14) : 11",7],["11 − 4000 : 800",6],["8 − 350 : 50",1],["44 − 7 × 5",9],["(166 − 46) : 12",10],
  ["(80 + 20) : 10",10],["(26 + 24) : 10",5],["37 − 9 × 3",10],["1 + 60 : 30",3],["61 − 8 × 7",5],
  ["(158 − 70) : 11",8],["(143 − 35) : 12",9],["240 : 40 − 4",2],["27 − 3 × 8",3],["(29 + 27) : 8",7],
  ["6 − 100 : 50",4],["(63 − 52) : 11",1],["2 + 800 : 400",4],["240 : 30 + 2",10],["160 : 40 × 2",8],
  ["51 − 7 × 7",2],["600 : 50 − 3",9],["(32 + 32) : 8",8],["(147 − 83) : 8",8],["240 : 60 − 1",3],
  ["5 × 5 − 7 × 3",4],["(13 + 35) : 12",4],["37 − 4 × 9",1],["(92 − 26) : 11",6],["400 : 200 × 2",4],
  ["22 − 5 × 3",7],["18 − 3 × 5",3],["7 − 300 : 50",1],["9000 : 1000 − 6",3],["1000 : 500 + 2",4],
  ["6300 : 900 + 2",9],["13 − 8000 : 1000",5],["44 − 9 × 4",8],["(113 − 78) : 7",5],["(28 + 28) : 7",8],
  ["6300 : 700 + 1",10],["2 + 160 : 80",4],["(54 − 47) : 7",1],["8800 : 800 − 6",5],["8 × 5 − 8 × 4",8],
  ["600 : 60 − 2",8],["(32 + 22) : 6",9],["76 − 8 × 9",4],["8 × 6 : 24",2],["140 : 70 + 1",3],
  ["15 − 360 : 60",9],["(67 − 19) : 6",8],["8 − 2100 : 700",5],["9 − 1200 : 200",3],["6300 : 700 − 2",7],
  ["6 − 200 : 50",2],["2700 : 900 + 1",4],["700 : 70 − 2",8],["(22 + 20) : 6",7],["(65 − 35) : 10",3],
  ["4500 : 500 − 1",8],["7700 : 700 − 2",9],["5 + 1200 : 600",7],["(63 − 15) : 12",4],["7 − 270 : 90",4],
  ["120 : 30 + 5",9],["22 − 3 × 5",7],["1800 : 900 + 7",9],["180 : 60 + 1",4],["(36 − 30) : 6",1],
  ["9 − 4200 : 700",3],["6 × 7 − 8 × 5",2],["7 − 540 : 90",1],["3 + 120 : 20",9],["(46 + 26) : 9",8],
  ["8 × 4 : 32",1],["10 − 720 : 90",2],["(110 − 94) : 8",2],["(14 + 22) : 12",3],["4800 : 800 − 2",4],
  ["15 − 6400 : 800",7],["(117 − 73) : 11",4],["5 − 1600 : 800",3],["2 + 240 : 80",5],["19 − 3 × 6",1],
  ["5 × 9 − 6 × 6",9],["140 : 70 + 2",4],["4 − 270 : 90",1],["(45 − 23) : 11",2],["1200 : 300 − 3",1],
  ["47 − 5 × 8",7],["7700 : 700 − 1",10],["(73 − 33) : 8",5],["120 : 40 + 1",4],["11 − 600 : 200",8],
  ["45 − 6 × 7",3],["(43 − 23) : 10",2],["(44 − 37) : 7",1],["16 − 560 : 70",8],["73 − 7 × 9",10],
  ["1 + 420 : 70",7],["(169 − 99) : 10",7],["7 × 3 : 21",1],["(63 − 33) : 6",5],["6000 : 600 − 6",4],
  ["(36 + 60) : 12",8],["2 + 900 : 300",5],["(65 − 25) : 10",4],["4800 : 400 − 4",8],["5 × 8 − 4 × 9",4],
  ["10 − 420 : 70",4],["280 : 40 − 2",5],["21 − 3 × 5",6],["5 × 8 : 4",10],["(64 − 31) : 11",3],
  ["55 − 8 × 6",7],["2700 : 300 + 1",10],["(84 − 72) : 12",1],["5000 : 500 − 1",9],["180 : 30 − 1",5],
  ["350 : 50 − 4",3],["38 − 5 × 6",8],["(105 − 83) : 11",2],["46 − 5 × 9",1],["73 − 9 × 8",1],
  ["8 × 10 : 40",2],["8800 : 800 − 2",9],["28 − 3 × 6",10],["(76 + 23) : 11",9],["(156 − 56) : 10",10],
  ["9 × 12 : 36",3],["33 − 5 × 6",3],["180 : 90 + 6",8],["11 − 3000 : 500",5],["8 × 12 : 96",1],
  ["16 − 450 : 50",7],["1 + 1000 : 200",6],["540 : 90 − 5",1],["(120 − 57) : 9",7],["150 : 30 + 2",7],
  ["8000 : 800 − 5",5],["(74 − 34) : 10",4],["3600 : 900 × 2",8],["(51 + 29) : 8",10],["(97 − 61) : 9",4],
  ["7 − 2500 : 500",2],["2000 : 1000 + 3",5],["12 − 4500 : 500",3],["2700 : 300 − 1",8],["560 : 70 − 2",6],
  ["1 + 2000 : 400",6],["(66 − 60) : 6",1],["(11 + 17) : 7",4],["5 − 3600 : 900",1],["(42 + 38) : 8",10],
  ["880 : 80 − 3",8],["350 : 50 + 2",9],["(49 − 13) : 9",4],["5 + 150 : 30",10],["1400 : 200 + 2",9],
  ["10 − 480 : 60",2],["8 − 3200 : 800",4],["14 − 5600 : 700",6],["(96 − 16) : 8",10],["140 : 70 + 8",10],
  ["1 + 2700 : 900",4],["9 − 600 : 300",7],["10 − 320 : 40",2],["5000 : 1000 − 4",1],["4 + 1800 : 600",7],
  ["4500 : 500 − 6",3],["(49 + 61) : 11",10],["56 − 6 × 8",8],["240 : 80 × 2",6],["8 − 630 : 90",1],
  ["(181 − 61) : 12",10],["7 − 210 : 70",4],["(147 − 93) : 6",9],["14 − 7200 : 800",5],["(20 + 57) : 11",7],
  ["240 : 30 − 1",7],["(41 + 58) : 11",9],["6 − 350 : 70",1],["80 : 40 + 1",3],["60 : 30 + 3",5],
  ["16 − 7000 : 1000",9],["87 − 9 × 9",6],["30 − 4 × 6",6],["2400 : 300 − 5",3],["(99 − 71) : 7",4],
  ["(78 − 14) : 8",8],["(59 − 29) : 6",5],["12 × 3 : 18",2],["31 − 4 × 7",3],["1 + 450 : 90",6],
  ["(55 − 43) : 12",1],["4 × 8 : 16",2],["3 × 5 : 15",1],["(149 − 61) : 11",8],["(68 + 22) : 9",10],
  ["2500 : 500 + 5",10],["(99 − 51) : 12",4],["150 : 50 × 3",9],["2100 : 700 + 7",10],["10 × 9 : 15",6],
  ["3 × 9 − 3 × 6",9],["50 − 9 × 5",5],["2000 : 1000 + 5",7],["11000 : 1000 − 2",9],["(139 − 29) : 11",10],
  ["3 × 3 : 9",1],["19 − 7200 : 800",10],["1 + 200 : 50",5],["(66 − 24) : 7",6],["37 − 6 × 5",7],
  ["3 + 7000 : 1000",10],["14 − 320 : 80",10],["640 : 80 − 1",7],["880 : 80 − 1",10],["1800 : 300 − 3",3],
  ["18 − 5 × 3",3],["120 : 40 × 3",9],["(77 − 61) : 8",2],["27 − 6 × 4",3],["12 − 800 : 400",10],
  ["1600 : 800 + 5",7],["(59 − 41) : 9",2],["1800 : 900 + 1",3],["160 : 80 + 5",7],["4 × 5 : 2",10],
  ["11 − 80 : 40",9],["31 − 5 × 6",1],["5 − 60 : 20",2],["(104 − 77) : 9",3],["560 : 70 − 4",4],
  ["12 − 5400 : 600",3],["400 : 200 + 1",3],["10 − 450 : 90",5],["39 − 6 × 6",3],["3 + 1600 : 800",5],
  ["3 × 9 : 27",1],["77 − 9 × 8",5],["(128 − 92) : 6",6],["(103 − 26) : 11",7],["66 − 9 × 7",3],
  ["7 − 1600 : 400",3],["10 − 2400 : 800",7],["40 − 5 × 6",10],["(11 + 45) : 8",7],["(26 + 34) : 6",10],
  ["(52 + 18) : 7",10],["8 − 800 : 400",6],["9 − 300 : 50",3],["9 × 11 : 33",3],["88 − 9 × 9",7],
  ["4 + 120 : 40",7],["36 − 4 × 8",4],["16 − 540 : 90",10],["2 + 400 : 80",7],["350 : 70 − 3",2],
  ["1500 : 300 + 1",6],["(132 − 77) : 11",5],["(145 − 89) : 7",8],["810 : 90 − 5",4],["21 − 3 × 6",3],
  ["10 × 7 : 70",1],["360 : 30 − 3",9],["540 : 90 − 2",4],["(93 − 87) : 6",1],["(16 + 24) : 10",4],
  ["1 + 2400 : 600",5],["3200 : 800 + 1",5],["71 − 7 × 9",8],["38 − 6 × 6",2],["(109 − 13) : 12",8],
  ["4500 : 900 + 2",7],["35 − 5 × 6",5],["42 − 5 × 7",7],["(11 + 25) : 12",3],["22 − 3 × 4",10],
  ["14 − 120 : 30",10],["400 : 80 + 4",9],["1 + 1200 : 400",4],["(53 − 35) : 9",2],["15 − 3 × 3",6],
  ["(143 − 53) : 9",10],["1500 : 500 + 2",5],["480 : 60 − 5",3],["48 − 7 × 6",6],["2400 : 800 + 5",8],
  ["14 − 4800 : 600",6],["11000 : 1000 − 4",7],["13 − 7200 : 800",4],["(12 + 24) : 6",6],["(50 − 34) : 8",2],
  ["1400 : 700 + 3",5],["(29 + 34) : 7",9],["7 × 4 : 14",2],["6 − 400 : 200",4],["3 + 1500 : 300",8],
  ["39 − 9 × 4",3],["7 − 450 : 90",2],["3 + 240 : 80",6],["(17 + 13) : 10",3],["120 : 20 − 5",1]
  ];

  /* Фолбэк-генератор: когда 1000 примеров пройдены, примеры создаются на лету
     теми же шаблонами и того же уровня сложности (та же функция, что делала пул). */
  function genOne(rnd, wantR){
    function ri(a,b){ return a+Math.floor(rnd()*(b-a+1)); }
    function pick(arr){ return arr[Math.floor(rnd()*arr.length)]; }
    var ROUND=[20,30,40,50,60,70,80,90,200,300,400,500,600,700,800,900,1000];
    var R=(wantR>=1&&wantR<=10)?wantR:ri(1,10);
    for(var att=0;att<200;att++){
      var t=ri(1,10), k,a,b,c,d,p,q,s,B,C;
      if(t===1 && R>=3){ k=ri(2,R-1); C=R-k; B=pick(ROUND); return {x:(B*k)+" : "+B+" + "+C, a:R}; }
      if(t===2 && R<=10){ C=ri(1,Math.min(6,12-R)); if(C<1) continue; k=R+C; B=pick(ROUND); return {x:(B*k)+" : "+B+" − "+C, a:R}; }
      if(t===3){ a=ri(3,12); b=ri(3,12); p=a*b; if(p%R!==0) continue; C=p/R; if(C<2||C>120||C===a||C===b) continue; return {x:a+" × "+b+" : "+C, a:R}; }
      if(t===4 && R>=3){ C=ri(6,12); s=R*C; if(s<26) continue; a=ri(11,s-11); b=s-a; if(b<11) continue; return {x:"("+a+" + "+b+") : "+C, a:R}; }
      if(t===5){ C=ri(6,12); s=R*C; b=ri(13,99); return {x:"("+(s+b)+" − "+b+") : "+C, a:R}; }
      if(t===6){ b=ri(3,9); c=ri(3,9); return {x:(R+b*c)+" − "+b+" × "+c, a:R}; }
      if(t===7){ a=ri(3,9); b=ri(3,9); p=a*b; if(p-R<9) continue; c=ri(3,9); if((p-R)%c!==0) continue; d=(p-R)/c; if(d<3||d>9) continue; return {x:a+" × "+b+" − "+c+" × "+d, a:R}; }
      if(t===8){ k=pick([2,3,4,5]); if(R%k!==0) continue; C=R/k; if(C<2) continue; B=pick(ROUND); return {x:(B*k)+" : "+B+" × "+C, a:R}; }
      if(t===9){ k=ri(2,9); C=pick(ROUND); return {x:(R+k)+" − "+(C*k)+" : "+C, a:R}; }
      if(t===10 && R>=3){ k=ri(2,R-1); C=pick(ROUND); return {x:(R-k)+" + "+(C*k)+" : "+C, a:R}; }
    }
    var bb=3+Math.floor(rnd()*7), cc=3+Math.floor(rnd()*7);
    return {x:(R+bb*cc)+" − "+bb+" × "+cc, a:R};
  }

  /* =================== СОСТОЯНИЕ =================== */
  var sdk=null, root=null, E={}, rounds=[], meta=null, metaId=null, metaLoaded=false;
  var mode="idle";              // idle | play | done
  var game=null;                // {expr, ans, picked, result, startMs}
  var timerId=null, histFilter="all", curSheet=null, saving=false;

  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];}); }
  function t(k,p){ return sdk.t(k,p); }
  function pad2(n){ return (n<10?"0":"")+n; }
  function todayStr(){ var d=new Date(); return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate()); }
  function nowHM(){ var d=new Date(); return pad2(d.getHours())+":"+pad2(d.getMinutes()); }
  function humanDate(s){ try{ var p=String(s).split("-"); return sdk.formatDate(new Date(+p[0],+p[1]-1,+p[2])); }catch(e){ return s||""; } }

  /* ----- данные ----- */
  function dataOf(it){ return (it&&it.data)||{}; }
  function reloadRounds(){ return sdk.data.list("rounds").then(function(list){ rounds=(list||[]).slice().sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); }); }); }
  function loadMeta(){
    return sdk.data.list("meta").then(function(list){
      if(list&&list.length){ metaId=list[0].id; meta=Object.assign({exIdx:0}, list[0].data||{}); return; }
      return sdk.data.create("meta",{exIdx:0}).then(function(it){ metaId=it&&it.id; meta={exIdx:0}; });
    });
  }
  function setExIdx(v){ if(!meta) return; meta.exIdx=v; if(metaId) sdk.data.update("meta",metaId,{exIdx:v}); }
  /* следующий пример: из пула по указателю; после 1000 — из генератора */
  function nextExample(){
    var idx=(meta&&meta.exIdx>0)?Math.floor(meta.exIdx):0;
    var e=(idx<POOL.length) ? {x:POOL[idx][0], a:POOL[idx][1]} : genOne(Math.random, 0);
    setExIdx(idx+1);
    return e;
  }

  /* ----- статистика ----- */
  function stats(){
    var s={total:0,win:0,wrong:0,timeout:0,points:0};
    rounds.forEach(function(it){
      var r=dataOf(it).result;
      if(r==="win"){ s.win++; s.points+=10; }
      else if(r==="wrong"){ s.wrong++; s.points-=5; }
      else if(r==="timeout"){ s.timeout++; s.points-=5; }
      else return;
      s.total++;
    });
    return s;
  }
  function hud(){ var s=stats(); sdk.ui.hud({ left:t("hudLeft"), cNum:s.win, cLbl:t("hudCLbl"), rNum:s.points, rLbl:t("hudRLbl") }); }

  /* =================== СЦЕНА ИГРЫ =================== */
  function ringSVG(frac){
    var off=RING_C*(1-Math.max(0,Math.min(1,frac)));
    return '<svg viewBox="0 0 48 48" aria-hidden="true"><circle class="track" cx="24" cy="24" r="20"/>'
      +'<circle class="prog" id="gnProg" cx="24" cy="24" r="20" stroke-dasharray="'+RING_C.toFixed(2)+'" stroke-dashoffset="'+off.toFixed(2)+'"/></svg>';
  }
  function padHtml(){
    var h='<div class="gn-pad" id="gnPad">';
    for(var n=1;n<=10;n++){
      var cls="";
      if(mode==="done"&&game){
        if(n===game.ans) cls=" ok";
        else if(game.picked===n) cls=" bad";
      }
      h+='<button type="button" class="gn-key'+cls+'" data-n="'+n+'" aria-label="'+esc(t("aria.answer",{n:n}))+'">'+n+'</button>';
    }
    return h+'</div>';
  }
  function circleHtml(){
    var cls="", inner="?";
    if(mode==="done"&&game){
      if(game.result==="win"){ cls=" win"; inner=String(game.picked); }
      else if(game.result==="wrong"){ cls=" lose"; inner=String(game.picked); }
      else { cls=" to"; inner="⏱"; }
    }
    return '<div class="gn-circle'+cls+'" id="gnCircle">'+inner+'</div>';
  }
  function renderStage(){
    if(!root||!E.stage) return;
    if(!sdk.can("edit")){
      E.stage.innerHTML='<div class="gn-card"><p class="gn-note">'+esc(t("parentNote"))+'</p></div>';
      return;
    }
    if(mode==="idle"){
      E.stage.innerHTML='<div class="gn-card">'
        +'<div class="gn-circle">?</div>'
        +'<h3 class="gn-card-title">'+esc(t("startTitle"))+'</h3>'
        +'<p class="gn-hint">'+esc(t("startHint",{s:ROUND_SECONDS}))+'</p>'
        +'<button class="gn-bigbtn" data-act="start">'+esc(t("startBtn"))+'</button>'
        +'</div>';
      return;
    }
    if(mode==="play"){
      E.stage.innerHTML='<div class="gn-card">'
        +'<div class="gn-timer" id="gnTimer" role="timer" aria-label="'+esc(t("aria.timeLeft",{n:ROUND_SECONDS}))+'">'+ringSVG(1)
          +'<div class="num" id="gnTimeNum">'+ROUND_SECONDS+'</div><div class="u">'+esc(t("unit"))+'</div></div>'
        +circleHtml()
        +'<div class="gn-expr">'+esc(game.expr)+' = <span class="q">?</span></div>'
        +'<p class="gn-hint">'+esc(t("pickHint"))+'</p>'
        +padHtml()
        +'</div>';
      E.prog=E.stage.querySelector("#gnProg"); E.timeNum=E.stage.querySelector("#gnTimeNum"); E.timerBox=E.stage.querySelector("#gnTimer");
      return;
    }
    /* mode === "done" — итог раунда */
    var resKey=game.result==="win"?"resWin":(game.result==="wrong"?"resWrong":"resTimeout");
    E.stage.innerHTML='<div class="gn-card">'
      +circleHtml()
      +'<div class="gn-expr">'+esc(game.expr)+' = <span class="ans">'+game.ans+'</span></div>'
      +'<div class="gn-res '+game.result+'">'+esc(t(resKey))+'</div>'
      +(game.result==="win"?"":'<p class="gn-hint">'+esc(t("correctIs",{n:game.ans}))+'</p>')
      +padHtml()
      +'<button class="gn-bigbtn" data-act="next">'+esc(t("nextBtn"))+'</button>'
      +'</div>';
    E.prog=null; E.timeNum=null; E.timerBox=null;
  }

  /* ----- таймер раунда (по Date.now — фоновое время тоже считается) ----- */
  function stopTimer(){ if(timerId){ clearInterval(timerId); timerId=null; } }
  function tick(){
    if(mode!=="play"||!game||!root) return;
    var el=(Date.now()-game.startMs)/1000, rem=Math.max(0,ROUND_SECONDS-el);
    if(E.prog) E.prog.style.strokeDashoffset=(RING_C*(1-rem/ROUND_SECONDS)).toFixed(2);
    if(E.timeNum) E.timeNum.textContent=Math.ceil(rem);
    if(E.timerBox) E.timerBox.classList.toggle("low", rem<=5);
    if(rem<=0) resolveRound(null);
  }
  function start(){
    if(!sdk.can("edit")||!metaLoaded||mode==="play") return;
    var e=nextExample();
    game={expr:e.x, ans:e.a, picked:null, result:null, startMs:Date.now()};
    mode="play"; saving=false;
    renderStage();
    stopTimer(); timerId=setInterval(tick,200);
    sdk.ui.haptics(8);
  }
  function pickAnswer(n){
    if(mode!=="play"||!game||game.picked!=null) return;
    resolveRound(n);
  }
  function resolveRound(picked){
    if(mode!=="play"||!game||saving) return;
    saving=true; stopTimer();
    game.picked=(picked==null?null:picked);
    game.result=(picked===game.ans)?"win":(picked==null?"timeout":"wrong");
    mode="done";
    var delta=(game.result==="win")?10:-5;
    sdk.points.add(delta,"guess_"+game.result);
    var payload={expr:game.expr, ans:game.ans, picked:game.picked, result:game.result, date:todayStr(), time:nowHM()};
    sdk.events.track("round_played",{result:game.result, expr:game.expr, ans:game.ans, picked:game.picked});
    if(game.result==="win"){ sdk.ui.confetti(); sdk.ui.chime(); sdk.ui.haptics([20,30,60]); }
    else if(game.result==="wrong"){ sdk.ui.haptics(15); }
    else { sdk.ui.haptics([10,30,10]); }
    renderStage();
    sdk.data.create("rounds",payload).then(function(it){
      if(!root) return;
      if(it) rounds.unshift(it); else return reloadRounds();
    }).then(function(){ if(!root) return; hud(); renderHistory(); })
      .catch(function(){ if(root) sdk.ui.toast(t("saveFailed")); });
  }

  /* =================== ИСТОРИЯ (3 отдела, как в зубах) =================== */
  function isResult(r){ return r==="win"||r==="wrong"||r==="timeout"; }
  function histCounts(){
    var c={all:0,win:0,wrong:0,timeout:0};
    rounds.forEach(function(it){ var r=dataOf(it).result; if(isResult(r)){ c[r]++; c.all++; } });
    return c;
  }
  function setHistFilter(f){ histFilter=f; renderHistory(); sdk.ui.haptics(6); }
  function renderHistory(){
    if(!root) return;
    var c=histCounts();
    if(E.filter){
      Array.prototype.forEach.call(E.filter.querySelectorAll(".gn-fchip"),function(b){
        var f=b.getAttribute("data-f"), n=b.querySelector(".n"); if(n) n.textContent=c[f]!=null?c[f]:0;
        b.classList.toggle("active", f===histFilter);
      });
    }
    if(!E.list) return;
    var list=rounds.filter(function(it){ var r=dataOf(it).result; if(!isResult(r)) return false; return histFilter==="all"||r===histFilter; });
    if(!list.length){ E.list.innerHTML='<div class="gn-empty">'+esc(t("historyEmpty"))+'</div>'; return; }
    E.list.innerHTML=list.slice(0,60).map(function(it){
      var d=dataOf(it), badge=d.result==="win"?t("badgeWin"):(d.result==="wrong"?t("badgeWrong"):t("badgeTimeout"));
      var sub=(d.result==="wrong"&&d.picked!=null)?'<small class="pk">'+esc(t("histPicked",{n:d.picked}))+'</small>':"";
      return '<div class="gn-row"><div class="when">'+esc(humanDate(d.date))+'<small>'+esc(d.time||"")+'</small></div>'
        +'<div class="ex">'+esc(d.expr)+' = '+esc(String(d.ans))+sub+'</div>'
        +'<span class="gn-badge '+esc(d.result)+'">'+esc(badge)+'</span></div>';
    }).join("");
  }

  /* =================== СТАТИСТИКА (шторка по эскизу) =================== */
  function openStats(){
    sdk.events.track("viewed_stats",{});
    var s=stats(), node=document.createElement("div");
    node.innerHTML='<h2>'+esc(t("statsTitle"))+'</h2>'
      +'<div class="gn-pgrid">'
        +'<div class="gn-pstat total"><div class="n">'+s.total+'</div><div class="l">'+esc(t("statTotal"))+'</div></div>'
        +'<div class="gn-pstat win"><div class="n">'+s.win+'</div><div class="l">'+esc(t("statWin"))+'</div></div>'
        +'<div class="gn-pstat wrong"><div class="n">'+s.wrong+'</div><div class="l">'+esc(t("statWrong"))+'</div></div>'
        +'<div class="gn-pstat to"><div class="n">'+s.timeout+'</div><div class="l">'+esc(t("statTimeout"))+'</div></div>'
      +'</div>'
      +'<div class="sheet-actions" style="margin-top:14px"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("common.close"))+'</button></div>';
    var sh=sdk.ui.sheet(node); curSheet=sh;
    node.querySelector("[data-close]").addEventListener("click",sh.close);
  }

  /* =================== mount / unmount =================== */
  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl; E={}; rounds=[]; meta=null; metaId=null; metaLoaded=false;
    mode="idle"; game=null; histFilter="all"; curSheet=null; saving=false;
    var title=sdk.i18n.t("tile.guess");
    root.innerHTML='<div class="gn">'
      +'<div class="gn-header"><button class="back" id="gnBack" aria-label="'+esc(t("common.back"))+'">'+BACK_IC+'</button>'
        +'<div class="gn-head-main"><div class="gn-title">'+esc(title)+'</div>'
        +'<div class="gn-sub">'+esc(t("subtitle"))+'</div></div>'
        +'<button class="hbtn" id="gnStats" aria-label="'+esc(t("aria.stats"))+'">'+STATS_IC+'</button></div>'
      +'<div id="gnStage"></div>'
      +(sdk.can("edit")
        ?'<div class="gn-legend"><span class="lg win">'+esc(t("legWin"))+'</span><span class="lg wrong">'+esc(t("legWrong"))+'</span><span class="lg to">'+esc(t("legTimeout"))+'</span></div>'
        :"")
      +'<div class="store-section">'+esc(t("historyTitle"))+'</div>'
      +'<div class="gn-filter" id="gnFilter">'
        +'<button class="gn-fchip active" data-f="all"><span class="t">'+esc(t("filterAll"))+'</span><span class="n">0</span></button>'
        +'<button class="gn-fchip" data-f="win"><span class="t">'+esc(t("filterWin"))+'</span><span class="n">0</span></button>'
        +'<button class="gn-fchip" data-f="wrong"><span class="t">'+esc(t("filterWrong"))+'</span><span class="n">0</span></button>'
        +'<button class="gn-fchip" data-f="timeout"><span class="t">'+esc(t("filterTimeout"))+'</span><span class="n">0</span></button>'
      +'</div>'
      +'<div class="gn-list" id="gnList"></div>'
    +'</div>';
    E.stage=root.querySelector("#gnStage"); E.filter=root.querySelector("#gnFilter"); E.list=root.querySelector("#gnList");
    root.querySelector("#gnBack").addEventListener("click",function(){ sdk.ui.back(); });
    root.querySelector("#gnStats").addEventListener("click",openStats);
    /* делегирование — на внутреннем .gn (пересоздаётся при каждом mount), НЕ на root:
       root живёт между mount'ами, и слушатели на нём наслаивались бы (урок rating) */
    root.querySelector(".gn").addEventListener("click",function(e){
      var key=e.target.closest(".gn-key");
      if(key){ pickAnswer(parseInt(key.getAttribute("data-n"),10)); return; }
      var act=e.target.closest("[data-act]");
      if(act){ var a=act.getAttribute("data-act"); if(a==="start"||a==="next") start(); return; }
      var chip=e.target.closest(".gn-fchip");
      if(chip){ setHistFilter(chip.getAttribute("data-f")); return; }
    });
    renderStage(); renderHistory(); hud();
    Promise.resolve().then(loadMeta).then(reloadRounds).then(function(){
      if(!root) return; metaLoaded=true; renderHistory(); hud();
    }).catch(function(){ if(!root) return; metaLoaded=true; renderHistory(); hud(); });
  }
  function unmount(){
    stopTimer();
    if(curSheet&&curSheet.close){ try{ curSheet.close(); }catch(e){} } curSheet=null;
    E={}; rounds=[]; root=null; game=null; mode="idle"; meta=null; metaId=null; metaLoaded=false; saving=false;
  }

  RobTop.register({ id:"guess", mount:mount, unmount:unmount, messages:MESSAGES });
})();
