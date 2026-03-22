
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = "normtub_secret";

app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use(express.static("public"));

const USERS = "data/users.json";
const VIDEOS = "data/videos.json";

function read(f){ return JSON.parse(fs.readFileSync(f)) }
function write(f,d){ fs.writeFileSync(f, JSON.stringify(d,null,2)) }

if(!fs.existsSync(USERS)) write(USERS,{});
if(!fs.existsSync(VIDEOS)) write(VIDEOS,[]);

// AUTH
app.post("/register", async (req,res)=>{
  let users = read(USERS);
  let {username,password} = req.body;
  if(users[username]) return res.status(400).send("exists");
  users[username] = await bcrypt.hash(password,10);
  write(USERS,users);
  res.send("ok");
});

app.post("/login", async (req,res)=>{
  let users = read(USERS);
  let {username,password} = req.body;
  if(!users[username]) return res.status(400).send("no");
  let ok = await bcrypt.compare(password, users[username]);
  if(!ok) return res.status(401).send("wrong");

  let token = jwt.sign({username}, SECRET);
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

// upload
const upload = multer({ storage: multer.memoryStorage() });

app.post("/upload", auth, upload.single("video"), (req,res)=>{
  let file = Date.now()+".mp4";
  fs.writeFileSync("uploads/"+file, req.file.buffer);

  let videos = read(VIDEOS);
  videos.push({file,user:req.user.username});
  write(VIDEOS,videos);

  res.send("ok");
});

// get videos
app.get("/videos",(req,res)=>{
  res.json(read(VIDEOS));
});

app.listen(PORT, ()=>console.log("NormTub PRO running"));
