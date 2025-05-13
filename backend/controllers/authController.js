const User = require("../models/User")
const generateToken = require("../utils/generateToken")

// POST /api/auth/register
exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body

  try {
    const existingUser = await User.findOne({ email })
    if (existingUser) return res.status(400).json({ message: "User already exists" })

    const user = await User.create({ name, email, password })
    const token = generateToken(user._id)

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      token,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
}

// POST /api/auth/login
exports.loginUser = async (req, res) => {
  const { email, password } = req.body

  try {
    const user = await User.findOne({ email })
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const token = generateToken(user._id)

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      token,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
}
