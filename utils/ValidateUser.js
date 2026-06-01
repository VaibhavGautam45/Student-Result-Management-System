 const validator=require("validator");

 function ValidateUser(data){
    let mandatoryField=["name","username","password","email"];
     let isAllowed =  mandatoryField.every((k)=>Object.keys(data).includes(k));
     if(!isAllowed)
        throw new Error("field missing");

   if (!data.email.endsWith("@gmail.com")) {
    return res.status(400).json({ message: "Only Gmail allowed" });
}

  if(!validator.isEmail(data.email))
    throw new Error("invalid Email");

 

  if(!validator.isStrongPassword(data.password))
       throw new Error("week password");
};
   
//  if(!(username || username.length<3 || username.length>20))
//     throw new Error("username should be betweem 3 to 20 character");



 
 module.exports= ValidateUser;
 