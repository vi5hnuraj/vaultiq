// controllers/investor.controller.js
import { query } from '../config/db.js';
import * as blockchainService from '../services/blockchain.service.js';

export const getAvailableInvoices = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT id, nft_id, customer_name, invoice_amount, funded_amount, ipfs_cid, preferred_token_symbol, due_date, status, tx_hash, tx_funded_hash, tx_repaid_hash
      FROM enterpriseInv
      WHERE status IN ('pending', 'funded', 'repaid')
      ORDER BY created_at ASC
    `);

    res.json({ invoices: rows });
  } catch (err) {
    console.error('Error fetching available invoices:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const fundInvoice = async (req, res) => {
  const { id } = req.params;
  const { investorAddress, amount } = req.body;

  try {
    const { rows } = await query(
      `SELECT * FROM enterpriseInv WHERE id = $1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    const invoice = rows[0];

    // 🚫 prevent double funding
    if (invoice.status === 'funded') {
      return res.status(400).json({ message: "Already funded" });
    }

    // ✅ UPDATE DB (Blockchain part is now handled by frontend)
    await query(
      `UPDATE enterpriseInv
       SET status = 'funded',
           investor_pubkey = $1,
           tx_funded_hash = $2
       WHERE id = $3`,
      [
        investorAddress,
        req.body.txHash,
        id
      ]
    );

    res.json({
      message: "Database updated successfully",
      txHash: req.body.txHash,
    });

  } catch (err) {
  console.error("🔥 FULL ERROR:", err);

  res.status(500).json({
    message: err.message || err.reason || "Funding failed",
  });
}
};