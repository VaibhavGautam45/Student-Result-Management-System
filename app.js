require('dotenv').config();

const express = require('express');
const app = express();
const path =require('path');
const bcrypt=require('bcrypt');
const jwt = require('jsonwebtoken');
const validator=require("validator");

const multerconfig=require("./config/multerconfig");
const ValidateUser =require("./utils/ValidateUser");

const userModel=require("./models/user");

const cookieParser = require('cookie-parser');
const { register } = require('module');
const { sign } = require('crypto');
const { log } = require('console');
const upload = require('./config/multerconfig');
const isAdmin=require("./utils/isAdmin");

const connectDB = require('./utils/Db');
connectDB();

app.use(express.static(path.join(__dirname,'public')));

app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());


const {
  calculateStats,
  calculateGrade,
  predictScore,
  detectRisk
} = require("./utils/analytics");
const PDFDocument = require("pdfkit");



 function isLoggedIn(req, res, next) {
  if (!req.cookies.token) {
    return res.redirect("/student/login");
  }

  try {
    let data = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    req.user = data;
    next();
  } catch (err) {
    return res.redirect("/student/login");
  }
}

 function isAdminLoggedIn(req, res, next) {
    let token = req.cookies.token;
  if (!req.cookies.token) {
    return res.redirect("/admin/login");
  }

  try {
    let decode = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    req.user = decode;
    next();
  } catch (err) {
    return res.redirect("/admin/login");
  }
}

app.get('/',(req,res)=>{
    res.render("firstpage");
});


app.get('/student/login',(req,res)=>{
    res.render("login")
})

app.get('/student/register',(req,res)=>{
    res.render("register")
})


app.post('/student/register',async (req,res)=>{
    let {username,name,age,password,email,rollNumber}=req.body;

     ValidateUser(req.body);

  let user = await  userModel.findOne({email});
    if(user) return res.status(500).send("already registered");
    
    
    bcrypt.genSalt(10,  function(err, salt) {
    bcrypt.hash(password, salt, async function(err, hash) {
        let user= await userModel.create({
        username,
        name,
        rollNumber,
        password : hash,
        email
    })
         let token = jwt.sign({email:email ,userid: user._id},process.env.JWT_SECRET);
          res.cookie("token",token);
         res.redirect("/student/login");
    })   
    })
        
});


app.post('/student/login', async (req,res)=>{
    let {password,email}=req.body;
   
  let user = await  userModel.findOne({email});
    if(!user) return res.status(500).send("something went wrong");

    bcrypt.compare(password, user.password, function(err, result) {
       if(result) {
        let token = jwt.sign({email:user.email }, process.env.JWT_SECRET);
          res.cookie("token",token);
          res.redirect("/student/login/dashboard");
       }
       else  res.send ("wrong credentials");
      
        
}); 
    });


 app.get('/logout',isLoggedIn,(req,res)=>{
    res.cookie("token",null,{expires:new Date(Date.now())});
    res.redirect("/");
 });


app.post("/admin/login",async (req,res)=>{
   let {email,password}=req.body;

  let admin = await userModel.findOne({email});
    if(!admin) return res.status(500).send("something went wrong");

    bcrypt.compare(password, admin.password, function(err, result) {
       if(result) {
        let token = jwt.sign({email:admin.email,isAdmin: admin.isAdmin }, process.env.JWT_SECRET);
          res.cookie("token",token);
          res.redirect("/admin/login/dashboard");
       }
       else  res.send ("wrong credentials");
})
})

app.get("/admin/login",(req,res)=>{
  res.render("adminLogin");
})


app.get("/admin/login/dashboard", isAdminLoggedIn, isAdmin, async (req, res) => {
  const students = await userModel.find().limit();
  const totalStudents = await userModel.countDocuments();

  res.render("adminDashboard", {
    students,
    totalStudents,
    totalResults: 0 // later update
  });
});

app.get("/add-result", isAdminLoggedIn, isAdmin, (req, res) => {
  res.render("add-result");
});

app.post("/add-result",isAdminLoggedIn,isAdmin, async (req, res) => {
  try {
    const { rollNumber, subject, marks } = req.body;
   
    // validation
    if (!rollNumber || !subject || !marks) {
      return res.send("All fields are required");
    }

    // find student
    const user = await userModel.findOne({ rollNumber: rollNumber.toString() });

    if (!user) {
      return res.send("user not found");
    }

    // push result
    user.results.push({ subject, marks });

    await user.save();

    res.send("Result added successfully ✅");
  } catch (err) {
    console.log(err);
    res.send("Error adding result");
  }
});


app.get("/student/login/dashboard",isLoggedIn, async (req, res) => {
  const user = await userModel.findOne({email: req.user.email });

  const allStudents = await userModel.find();

  // calculate avg for all
  const ranked = allStudents.map(s => {
    let avg = s.results.reduce((sum, r) => sum + r.marks, 0) / s.results.length;
    return { roll: s.rollNumber, avg };
  });

  // sort descending
  ranked.sort((a, b) => b.avg - a.avg);

  // find rank
  const rank = ranked.findIndex(s => s.roll === user.rollNumber) + 1;

  // your existing logic
  const { avg, stdDev } = calculateStats(user.results);

  const graded = user.results.map(r => ({
    subject: r.subject,
    marks: r.marks,
    grade: calculateGrade(r.marks, avg, stdDev)
  }));


  function getPerformanceStatus(score) {
  if (score < 40) return "Fail Risk ❌";
  if (score < 60) return "Average ⚠️";
  if (score < 80) return "Good 👍";
  return "Excellent 🔥";
}
  const prediction = predictScore(user.results);
  let status = getPerformanceStatus(prediction);

  const risk = detectRisk(user.results);

  res.render("dashboard", {
    user,
    graded,
    avg,
    prediction,
    status,
    risk,
    rank
  });
});



app.get("/student/:roll/pdf", async (req, res) => {
  const user = await userModel.findOne({ rollNumber: req.params.roll });

  if (!user) return res.send("Student not found");

  // 🔢 calculate stats
  const { avg, stdDev } = calculateStats(user.results);

  const graded = user.results.map(r => ({
    subject: r.subject,
    marks: r.marks,
    grade: calculateGrade(r.marks, avg, stdDev)
  }));

  const prediction = predictScore(user.results);
  const risk = detectRisk(user.results);

  // 📄 create PDF
  const doc = new PDFDocument({ margin: 40 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${user.rollNumber}_report.pdf`
  );

  doc.pipe(res);

  // 🎯 HEADER
  doc
    .fontSize(22)
    .text("Student Result Report", { align: "center" })
  

  doc.moveDown();

  // 👤 STUDENT INFO
  doc.fontSize(12);
  doc.text(`Name: ${user.name}`);
  doc.text(`Roll Number: ${user.rollNumber}`);

  doc.moveDown();

  // 📊 TABLE HEADER
  doc.font("Helvetica-Bold");
  doc.text("Subject", 50, doc.y);
  doc.text("Marks", 250, doc.y);
  doc.text("Grade", 350, doc.y);

  doc.moveDown();

  doc.font("Helvetica");

  // 📚 DATA
  graded.forEach(r => {
    doc.text(r.subject, 50, doc.y);
    doc.text(r.marks.toString(), 250, doc.y);
    doc.text(r.grade, 350, doc.y);
    doc.moveDown();
  });

  doc.moveDown();

  // 📈 ANALYTICS
  doc.font("Helvetica-Bold");
  doc.text("Performance Summary");

  doc.font("Helvetica");
  doc.text(`Average: ${avg.toFixed(2)}`);
  doc.text(`Predicted Score: ${prediction}`);
  doc.text(`Risk Level: ${risk}`);

  doc.moveDown();

  // 🏁 FOOTER
  doc.fontSize(10).text("Generated by SRMS System", {
    align: "center"
  });

  doc.end();
});

app.get("/students/details",isAdminLoggedIn,isAdmin,async (req,res)=>{
  try {
    const students = await userModel.find();

    res.render("studentsDetails", { students });
  } catch (err) {
    res.send("Error fetching students");
  }
});


app.get("/students/edit/:id", isAdminLoggedIn, isAdmin, async (req, res) => {
  const student = await userModel.findById(req.params.id);

  if (!student) return res.send("Student not found");

  res.render("editStudent", { student });
});




app.listen(process.env.PORT);