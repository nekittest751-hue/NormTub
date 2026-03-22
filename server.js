
const express = require("express");
const multer = require("multer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = "normtub_secret";

app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

const USERS = "data/users.json";
const VIDEOS = "data/videos.json";

function read(f){ return JSON.parse(fs.readFileSync(f)) }
function write(f,d){ fs.writeFileSync(f, JSON.stringify(d,null,2)) }

if(!fs.existsSync(USERS)) write(USERS, {});
if(!fs.existsSync(VIDEOS)) write(VIDEOS, []);

app.post("/register", async (req,res)=>{
  const {username,password} = req.body;
  let users = read(USERS);
  if(users[username]) return res.status(400).send("exists");
  users[username] = await bcrypt.hash(password,10);
  write(USERS,users);
  res.send("ok");
});

app.post("/login", async (req,res)=>{
  const {username,password} = req.body;
  let users = read(USERS);
  if(!users[username]) return res.status(400).send("no user");
  let ok = await bcrypt.compare(password, users[username]);
  if(!ok) return res.status(401).send("wrong");
  const token = jwt.sign({username}, SECRET);
  res.json({token});
});

function auth(req,res,next){
  try{
    const token = req.headers.authorization;
    req.user = jwt.verify(token, SECRET);
    next();
  }catch{
    res.sendStatus(401);
  }
}

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post("/upload", auth, upload.single("video"), (req,res)=>{
  const fileName = Date.now() + ".mp4";
  fs.writeFileSync("uploads/"+fileName, req.file.buffer);

  let videos = read(VIDEOS);
  videos.push({file:fileName, user:req.user.username});
  write(VIDEOS,videos);

  res.send("uploaded");
});

app.get("/videos",(req,res)=>{
  res.json(read(VIDEOS));
});

app.listen(PORT, ()=>console.log("NormTub running"));
