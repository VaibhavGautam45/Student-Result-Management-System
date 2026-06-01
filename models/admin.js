const mongoose = require("mongoose");
const bcrypt =require("bcrypt");
const userModel=require("./user");


async function createAdmin() {
  try {
    let hashedPassword = await bcrypt.hash("ro45", 10);

    let admin = await userModel.create({
      username: "admin",
      name: " Admin",
      email: "admin@gmail.com",
      age: 25,
      password: hashedPassword,
      isAdmin: true
    });

    console.log("✅ Admin created:", admin);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit();
  }
}

createAdmin();