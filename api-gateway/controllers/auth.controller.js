// auth.controller.js
import crypto from 'crypto';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { findUserByWallet, updateUserProfile } from '../models/auth.model.js';
import { query } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET;
const nonces = new Map();

const createLoginMessage = (nonce) => `Sign this message to authenticate with Vaultiq. Nonce: ${nonce}`;

export const login = async (req, res) => {
    const { wallet_address, signature, nonce, username, email, password } = req.body;
    const storedNonce = nonces.get(wallet_address);

    if (!storedNonce || storedNonce !== nonce) {
        return res.status(400).json({ message: 'Invalid or expired nonce' });
    }

    try {
        const message = createLoginMessage(nonce);
        const recoveredAddress = ethers.verifyMessage(message, signature);

        if (recoveredAddress.toLowerCase() !== wallet_address.toLowerCase()) {
            return res.status(401).json({ message: 'Invalid signature' });
        }

        findUserByWallet(wallet_address, async (err, user) => {
            if (err && err !== 'User not found') return res.status(400).json({ message: err });

            if (!user) {
                if (!username || !email || !password) {
                    return res.status(400).json({ message: 'Name, Email, and Password are required for signup' });
                }

                const password_hash = await bcrypt.hash(password, 10);

                await query(
                    "INSERT INTO users (wallet_address, role, username, email, password_hash) VALUES ($1, $2, $3, $4, $5)",
                    [wallet_address, 'user', username, email, password_hash]
                );
                user = { wallet_address, role: 'user', username, email };
                console.log(`Auto-registered user: ${username} (${wallet_address})`);
            } else {
                // Verify password for existing users
                if (user.password_hash) {
                    const isMatch = await bcrypt.compare(password, user.password_hash);
                    if (!isMatch) {
                        return res.status(401).json({ message: 'Invalid password' });
                    }
                }
            }

            const token = jwt.sign(
                { wallet_address, role: user.role },
                JWT_SECRET,
                { expiresIn: "24h" }
            );

            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "Strict",
                path: "/",
                maxAge: 24 * 60 * 60 * 1000,
            });

            nonces.delete(wallet_address);
            res.json({ message: "Login successful", token, role: user.role });
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Signature verification failed' });
    }
};




export const getNonce = (req, res) => {
    const { wallet_address } = req.query;
    if (!wallet_address) return res.status(400).json({ message: 'Missing wallet_address' });

    const nonce = crypto.randomBytes(16).toString('hex');
    nonces.set(wallet_address, nonce);
    res.json({ nonce, message: createLoginMessage(nonce) });
};
