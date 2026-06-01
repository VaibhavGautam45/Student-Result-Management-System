const { name } = require('ejs');
const mongoose = require('mongoose');
const isAdmin = require('../utils/isAdmin');


const resultSchema = new mongoose.Schema({
  subject: String,
  marks: Number
});

const userSchema = mongoose.Schema({
    username: {
       type: String,
       required:true,
       minLength:3,
       maxLength:30
    },

    rollNumber: {
  type: String,
  unique: true
},

results: [ resultSchema ],
   
    email:{
        type:String,
        required:true,
        unique:true,
        // enum:["abc,bgy"]
        trim:true,
        lowercase:true,
        immutable:true            //email can't update
    },

   name:{
    type:String,
    required:true,
    minLength:3,
    maxLength:20
},

   age:{
    type:Number,
    min:15,
    max:60

},

   password:{
    type:String,
    required:true,
   
},

    isAdmin:{
         type:Boolean,
         default:false,
    },

   profilepic:{
    type:String,
    default:"image.png"
   },
   posts:[{type: mongoose.Schema.Types.ObjectId, ref:"post"}]
},{timestamps:true});


module.exports = mongoose.model("user",userSchema);