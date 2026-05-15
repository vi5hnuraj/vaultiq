// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract VaultManager is ERC721URIStorage, Ownable {

    struct Invoice {
        address sme;
        address token;
        address investor;
        uint256 fundingAmount;
        uint256 repaymentAmount;
        uint256 dueDate;
        string metadataURI;
        bool isPaid;
        bool isFunded;
    }

    mapping(uint256 => Invoice) public invoices;
    uint256 public nextTokenId;

    event InvoiceMinted(uint256 indexed nftId, address indexed sme, string metadataURI);
    event InvoiceFunded(uint256 indexed nftId, address indexed investor, uint256 amount);
    event InvoiceRepaid(uint256 indexed nftId, address indexed sme, address indexed investor, uint256 amount);

    constructor(address initialOwner)
        ERC721("InvoiceNFT", "INVOICE")
        Ownable(initialOwner)
    {}

    // 🔹 Mint Invoice NFT
    function mintInvoice(
        address token,
        uint256 fundingAmount,
        uint256 repaymentAmount,
        uint256 dueDate,
        string memory metadataURI
    ) external returns (uint256) {

        require(token != address(0), "Invalid token address");

        uint256 tokenId = nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);

        invoices[tokenId] = Invoice({
            sme: msg.sender,
            token: token,
            investor: address(0),
            fundingAmount: fundingAmount,
            repaymentAmount: repaymentAmount,
            dueDate: dueDate,
            metadataURI: metadataURI,
            isPaid: false,
            isFunded: false
        });

        emit InvoiceMinted(tokenId, msg.sender, metadataURI);
        return tokenId;
    }

    // 🔹 Investor funds invoice
    function fundInvoice(uint256 tokenId) external {

        Invoice storage inv = invoices[tokenId];

        require(ownerOf(tokenId) != address(0), "Invoice does not exist");
        require(!inv.isFunded, "Already funded");
        require(inv.token != address(0), "Token not set");

        IERC20 token = IERC20(inv.token);

        require(
            token.transferFrom(msg.sender, inv.sme, inv.fundingAmount),
            "Funding transfer failed"
        );

        inv.investor = msg.sender;
        inv.isFunded = true;

        emit InvoiceFunded(tokenId, msg.sender, inv.fundingAmount);
    }

    // 🔹 SME repays investor
    function repayInvoice(uint256 tokenId) external {

        Invoice storage inv = invoices[tokenId];

        require(ownerOf(tokenId) != address(0), "Invoice does not exist");
        require(inv.isFunded, "Not funded");
        require(!inv.isPaid, "Already repaid");
        require(msg.sender == inv.sme, "Only SME can repay");

        IERC20 token = IERC20(inv.token);

        require(
            token.transferFrom(msg.sender, inv.investor, inv.repaymentAmount),
            "Repayment failed"
        );

        inv.isPaid = true;

        emit InvoiceRepaid(tokenId, msg.sender, inv.investor, inv.repaymentAmount);
    }

    // 🔹 Cancel invoice (only if not funded)
    function cancelInvoice(uint256 tokenId) external {

        Invoice storage inv = invoices[tokenId];

        require(ownerOf(tokenId) != address(0), "Invoice does not exist");
        require(msg.sender == inv.sme, "Only SME can cancel");
        require(!inv.isFunded, "Already funded");

        _burn(tokenId);
        delete invoices[tokenId];
    }

    // 🔹 View invoice details
    function getInvoice(uint256 tokenId) external view returns (Invoice memory) {

        require(ownerOf(tokenId) != address(0), "Invoice does not exist");
        return invoices[tokenId];
    }
}
