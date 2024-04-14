import express from "express";
import dotenv from "dotenv";
import { StreamChat } from "stream-chat";
import { genSaltSync, hashSync } from "bcrypt";

dotenv.config();

const { PORT, STREAM_API_KEY, STREAM_API_SECRET } = process.env;
const client = StreamChat.getInstance(STREAM_API_KEY!, STREAM_API_SECRET);

const app = express();
app.use(express.json());
const salt = genSaltSync(10);

interface User {
  id: string;
  email: string;
  hashed_password: string;
}
const USERS: User[] = [];

app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters." });
  }

  const existingUser = USERS.find((user) => user.email === email);
  if (existingUser) {
    return res.status(400).json({ error: "User already exists." });
  }

  try {
    const hashed_password = hashSync(password, salt);
    const id = Math.random().toString(36).slice(2);
    console.log("file: index.ts ~ line 41 ~ app.post ~ id", id);
    const user = { id: id, email, hashed_password };
    USERS.push(user);

    await client.upsertUser({
      id,
      email,
      name: email,
    });

    const token = client.createToken(id);

    return res.status(201).json({ token, user: { id, email } });
  } catch (error) {
    res.status(500).json({ error: "User already exists." });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = USERS.find((user) => user.email === email);
  const hashed_password = hashSync(password, salt);

  if (!user || user.hashed_password !== hashed_password) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const token = client.createToken(user.id);

  return res.status(200).json({ token, user: { id: user.id, email } });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
