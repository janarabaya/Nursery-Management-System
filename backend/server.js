const express = require("express");
const ADODB = require("node-adodb");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Handle Chrome DevTools requests (harmless, but prevents 404 errors)
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    res.status(204).end();
});

const db = ADODB.open(`Provider=Microsoft.ACE.OLEDB.12.0;Data Source=./database.accdb;`);

// Add
app.post("/add", async (req,res)=>{
    const {name,age}=req.body;
    try{
        await db.execute(`INSERT INTO users (name,age) VALUES ('${name}',${age})`);
        res.json({message:"Added Successfully"});
    }catch(err){res.json({error:err.message});}
});

// Update
app.put("/update/:id", async (req,res)=>{
    const {name,age}=req.body;
    const {id}=req.params;
    try{
        await db.execute(`UPDATE users SET name='${name}', age=${age} WHERE id=${id}`);
        res.json({message:"Updated Successfully"});
    }catch(err){res.json({error:err.message});}
});

// Delete
app.delete("/delete/:id", async (req,res)=>{
    const {id}=req.params;
    try{
        await db.execute(`DELETE FROM users WHERE id=${id}`);
        res.json({message:"Deleted Successfully"});
    }catch(err){res.json({error:err.message});}
});

// Get all
app.get("/users", async(req,res)=>{
    try{
        const data=await db.query("SELECT * FROM users");
        res.json(data);
    }catch(err){res.json({error:err.message});}
});

// Health check endpoint
app.get("/", (req, res) => {
    res.json({ message: "Server is running", status: "OK" });
});

app.listen(3000,()=>console.log("Server running on port 3000"));
