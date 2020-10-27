const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authConfig = require("../../config/auth");
const crypto = require("crypto");
const mailer = require("../../modules/mailer");

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

router.post("/forgot_password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).send({ error: "User not found" });
    }

    const token = crypto.randomBytes(20).toString("hex");

    const now = new Date();
    now.setHours(now.getHours() + 1);

    await User.findByIdAndUpdate(user.id, {
      $set: {
        passwordResetToken: token,
        passwordResetExpires: now,
      },
    });

    mailer.sendMail(
      {
        to: email,
        from: "marcelo+mx+noderest@gmail.com",
        subject: "Forgot you password?",
        template: "auth/forgot_password",
        context: { token },
      },
      (err) => {
        return err
          ? res.status(400).send({ error: "Error on send token to user" })
          : res.send();
      }
    );
  } catch (e) {
    res.status(500).send({ error: "Error on forgot password. Try again" });
  }
});

router.post("/reset_password", async (req, res) => {
  const { email, token, password } = req.body;

  try {
    const user = await User.findOne({ email }).select(
      "+passwordResetToken passwordResetExpires"
    );

    if (!user) {
      return restart.status(400).send({ error: "User not found" });
    }

    if (token !== user.passwordResetToken) {
      return res.status(400).send({ error: "Token invalid" });
    }

    const now = new Date();

    if (now >= user.passwordResetExpires) {
      return res.status(400).send({ error: "Token expired" });
    }

    user.password = password;
    await user.save();

    res.send();
  } catch (e) {
    res.status(500).send({ error: "Cannot reset password. Try again" });
  }
});

module.exports = (app) => app.use("/auth", router);
