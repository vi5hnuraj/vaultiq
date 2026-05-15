import express from 'express';
import { query } from '../config/db.js';

// ... (imports)

const router = express.Router();

// GET /api/v1/invoices/sme/:address
router.get('/sme/:address', async (req, res) => {
  const { address } = req.params;
  console.log(`🔍 FETCHING INVOICES FOR SME: ${address}`);

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    const { rows } = await query(`
      SELECT 
        id,
        nft_id,
        customer_name,
        invoice_amount,
        preferred_token_symbol,
        tx_hash,
        tx_funded_hash,
        tx_repaid_hash,
        ipfs_cid,
        created_at,
        status
      FROM enterpriseInv
      WHERE sme_address = $1
      ORDER BY created_at DESC
    `, [address]);

    console.log(`✅ FOUND ${rows.length} INVOICES FOR: ${address}`);
    res.json({ invoices: rows });
  } catch (err) {
    console.error('❌ Error fetching SME invoices:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// POST /api/v1/invoices/mark-repaid
router.post('/mark-repaid', async (req, res) => {
  const { nftId, txHash } = req.body;

  try {
    console.log("Updating NFT 👉", nftId, "with txHash 👉", txHash);

    await query(
      `UPDATE enterpriseInv SET status = 'repaid', tx_repaid_hash = $1 WHERE nft_id = $2`,
      [txHash, nftId]
    );

    res.json({ message: 'Updated to repaid' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update' });
  }
});

export default router;