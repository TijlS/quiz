const PORT = process.env.PORT || 3000;

const express = require("express");
const app = express();

const { createServer } = require("http");
const httpServer = createServer(app)

const { Server } = require("socket.io");
const io = new Server(httpServer)

const { v4: uuidv4 } = require("uuid");
const cookieParser = require("cookie-parser");
let questions = require("./questions.json");

app.set("views", "./server/views");
app.set("view engine", "ejs");
app.use(express.static("./server/public"));
app.use(cookieParser("QuizzC"));
app.use(express.urlencoded({ extended: false }));

let players = [];
let adminSocket = "";

const changeScore = (value) => {
	for (var i in players) {
		if (players[i].uuid == value) {
			players[i].score = parseInt(players[i].score, 10) + 1;
			break;
		}
	}
}

const getScore = (value) => {
	for (var i in players) {
		if (players[i].uuid == value) {
			return players[i].score;
		}
	}
}

const getTopUsers = () => {
	players.sort((a, b) =>
		a.score < b.score ? 1 : a.score > b.score ? -1 : 0
	);

	return players.slice(0, 3);
}

app.get("/", (req, res) => {
	res.render("index", {
		uuid: uuidv4(),
	});
});
app.post("/", (req, res) => {
    const player = {
        ...req.body,
        score : 0
    }
	players.push(player);

	io.to(adminSocket).emit("user-joined", { name: player.name });

	res.cookie("uuid", player.uuid, { maxAge: 60000 * 30 });
	res.redirect("/game");
});

app.get("/end", (req, res) => {
	res.render("end");
});

let currentQuestion = 0;

//GAME
app.get("/game", (req, res) => {
	res.render("game/index");
});
app.get("/game/question/:id", (req, res) => {
	res.render("game/question", {
		question: questions[req.params.id] ? JSON.parse(JSON.stringify(questions[req.params.id])) : undefined,
		number: parseInt(req.params.id)
	});
});
app.get("/game/answer/:id/:correct", (req, res) => {
	res.render("game/answer", {
		question: questions[req.params.id],
		correct: req.params.correct,
		score: getScore(req.cookies.uuid),
		currentQuestion: currentQuestion,
	});
});
app.post("/game/question/:id", (req, res) => {
	let correct = false
    const question = questions[req.params.id]
	const answer = req.body.answer

	console.log(`${req.cookies.uuid}: ${answer}`)

    switch (question.questionType) {
        case "select":
        case "image":
			console.table(question.answers)
			console.log(`ANSWER: ${question.answers.find(a => a.correct == true).text}`)
            if (question.answers[answer].correct === true) {
                correct = true;
                changeScore(req.cookies.uuid);
            }
            break;
        case "txtarea":
            const containsKeywords = question.keywords.every(keyword => {
				return answer.toLowerCase().includes(keyword)
			})

			console.log(`${req.cookies.uuid}: containsKeyword: ${containsKeywords}`)

			if(containsKeywords) {
				correct = true
				changeScore(req.cookies.uuid);
			}
            break;
		case "txt":
			if (answer.toLowerCase().includes(question.answer.toLowerCase())){
				correct = true
				changeScore(req.cookies.uuid);
			}
			break;
		case "drag":
			if (question.answer.join(';').toLowerCase() == answer){
				correct = true
				changeScore(req.cookies.uuid);
			}

			break;
    }

	console.log(`${req.cookies.uuid}: correct: ${correct}`)
	
	res.render("game/wait", {
		question: question,
		id: req.params.id,
		correct: correct,
	});
});
app.get("/game/podium", (req, res) => {
	io.to(adminSocket).emit("game_ended", { top_users: getTopUsers() });
	res.render("game/podium", {
		score: getScore(req.cookies.uuid),
	});
});

//CONTROL
app.get("/admin", (req, res) => {
	res.render("admin/index");
});

io.on("connection", (socket) => {
    socket.on('register_admin', () => {
        adminSocket = socket.id
    })

	socket.on("start-game-server", () => {
		socket.broadcast.emit("start-game", true);
	});
	socket.on("show_answer-server", () => {
		socket.broadcast.emit("show-answer", true);
	});
	socket.on("change-current-question", () => {
		currentQuestion++;
	});

    socket.on('get_game_info', () => {
        let gameInfo = {
            questionLength : questions.length
        }

        socket.emit('game_info', gameInfo)
    })
});

httpServer.listen(PORT, () => {
	console.log("SERVER STARTED AT PORT " + PORT);
});