// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title JAL — token proyek jajal.agent
/// @notice ERC-20 standar, 18 desimal, tanpa pajak transfer, tanpa owner.
///         Supply hanya bisa diminting oleh satu alamat `minter` (kontrak
///         JajalSale) yang ditetapkan sekali di constructor dan tidak bisa
///         diubah. Dalam desain jajal.agent, mint hanya terjadi satu kali:
///         saat graduation sale (lihat JajalSale.finalize). Bila sale gagal,
///         tidak ada JAL yang pernah diminting (supply tetap 0).
contract JAL {
    string public constant name = "jajal";
    string public constant symbol = "JAL";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    /// @notice Satu-satunya alamat yang boleh mint: kontrak JajalSale.
    address public immutable minter;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(address minter_) {
        require(minter_ != address(0), "JAL: minter zero address");
        minter = minter_;
    }

    /// @notice Mint token baru. Hanya boleh dipanggil oleh `minter`.
    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "JAL: caller is not the minter");
        require(to != address(0), "JAL: mint to zero address");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "JAL: insufficient allowance");
            unchecked {
                allowance[from][msg.sender] = allowed - amount;
            }
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "JAL: transfer to zero address");
        require(balanceOf[from] >= amount, "JAL: insufficient balance");
        unchecked {
            balanceOf[from] -= amount;
            balanceOf[to] += amount;
        }
        emit Transfer(from, to, amount);
    }
}
