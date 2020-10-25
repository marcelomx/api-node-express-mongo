const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth");

const User = require("../models/user");

const router = express.Router();

function generateToken(params = {}) {
  return jwt.sign(params, authConfig.secret, {
    expiresIn: 86400,
  });
}

router.post("/register", async (req, res) => {
  const { email } = req.body;
  try {
    if (await User.findOne({ email })) {
      return res.status(400).send({ error: "User already exists" });
    }
    const user = await User.create(req.body);
    user.password = undefined;

    const token = generateToken({ id: user.id });

    return res.send({ user, token });
  } catch (e) {
    return res.status(400).send({ error: "Registration failed" });
  }
});

router.post("/authenticate", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return res.status(400).send({ error: "User not found" });
  }

  if (!(await bcrypt.compare(password, user.password))) {
    return res.status(400).send({ error: "Password is invalid" });
  }

  user.password = undefined; // not return password!

  const token = generateToken({ id: user.id });

  return res.send({ user, token });
});

module.exports = (app) => app.use("/auth", router);
