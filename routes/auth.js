const jwt = require("jsonwebtoken");
const CryptoJS = require("crypto-js");
const User = require("../models/User");

const {
  validateUserSignup,
  validateUserLogin,
  validate,
} = require("../middlewares/validators");

const router = require("express").Router();

//REGISTER
router.post("/register", validateUserSignup, validate, async (req, res) => {
  const { name, email, phonenumber, username, lastlogin, role } = req.body;

  //check if email is duplicate
  const isNewEmailUser = await User.isThisEmailInUse(email);
  if (!isNewEmailUser)
    return res.status(400).json({
      success: false,
      message: "This email is already in use, try sign-in with a different one",
    });
  //check if name is duplicate
  const isNewUsername = await User.isThisUsernameInUse(username);
  console.log(`isNewUsername`, isNewUsername);
  if (!isNewUsername)
    return res.status(400).json({
      success: false,
      message:
        "This name is already in use, please sign in with a different username",
    });

  const newUser = new User({
    name: name,
    username: username,
    email: email,
    phonenumber: phonenumber,
    lastlogin: lastlogin,
    role: role,
    password: CryptoJS.AES.encrypt(
      req.body.password,
      process.env.PASS_SEC
    ).toString(),
  });
  try {
    let savedUser = await newUser.save();

    const accessToken = jwt.sign(
      {
        id: savedUser._id,
        role: savedUser.role,
      },
      process.env.JWT_SEC,
      { expiresIn: "3d" }
    );

    // savedUser = savedUser.toObject(); // swap for a plain javascript object instance
    // delete savedUser["lastlogin"];
    // res.status(200).json({ ...savedUser, accessToken });
    res.status(200).json({ savedUser, accessToken });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

//LOGIN
router.post("/login", validateUserLogin, validate, async (req, res) => {
  try {
    const user = await User.findOne({
      username: req.body.username,
    });

    if (!user) return res.status(401).json("Wrong Username");

    const hashedPassword = CryptoJS.AES.decrypt(
      user.password,
      process.env.PASS_SEC
    );

    const originalPassword = hashedPassword.toString(CryptoJS.enc.Utf8);

    const inputPassword = req.body.password;
    if (originalPassword != inputPassword)
      return res.status(401).json("Wrong Password");

    const accessToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SEC,
      { expiresIn: "3d" }
    );
    // let AuDate = new Date().toLocaleString("en-US", {
    //   timeZone: "Australia/Sydney",
    // });
    user.lastlogin = Date.now();
    const { password, ...others } = user._doc;
    return res.status(200).json({ ...others, accessToken });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

module.exports = router;
