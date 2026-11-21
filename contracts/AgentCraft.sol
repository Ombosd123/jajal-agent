// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface minimal registry Agent ID resmi (SPACE ID Agent ID,
///         ERC-721 non-transferable). Gate = balanceOf(alamat) > 0.
interface IAgentIdRegistry {
    function balanceOf(address owner) external view returns (uint256);
}

/// @title AgentCraft — direktori skill + endorsement untuk pemegang Agent ID
/// @notice Lapisan produk jajal.agent. Setiap pemegang Agent ID dapat
///         mendaftarkan skill dari daftar tetap di kontrak ini; pemegang
///         Agent ID lain dapat memberi endorsement pada skill agen tertentu
///         (satu endorsement per pasangan endorser-target-skill, tidak bisa
///         endorse diri sendiri). Profil skill menempel pada alamat pemegang
///         Agent ID — dan karena Agent ID tidak bisa dipindahtangankan,
///         satu identitas hanya punya satu suara.
///         Kontrak ini TANPA owner, TANPA dana, TANPA biaya, dan permanen.
contract AgentCraft {
    /// @notice Registry Agent ID resmi: 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F
    IAgentIdRegistry public immutable registry;

    /// @notice Daftar skill tetap (indeks = skillId, 0..19).
    string[] public skills;

    /// @notice Jumlah alamat yang saat ini mendaftarkan minimal 1 skill.
    uint256 public totalAgents;

    /// @notice hasSkill[agent][skillId] = skill sedang terdaftar.
    mapping(address => mapping(uint8 => bool)) public hasSkill;
    /// @notice Jumlah skill aktif per agen.
    mapping(address => uint256) public skillCountOf;
    /// @notice Generasi pendaftaran per (agen, skill). Naik setiap kali skill
    ///         dicabut, agar endorsement lama tidak hidup lagi bila skill
    ///         didaftarkan ulang — endorsement selalu dihitung per generasi.
    mapping(address => mapping(uint8 => uint256)) public skillGen;

    /// @notice _endoCount[target][skillId][gen] = jumlah endorsement aktif.
    mapping(address => mapping(uint8 => mapping(uint256 => uint256))) private _endoCount;
    /// @notice _endorsed[endorser][target][skillId][gen] = sudah endorse.
    mapping(address => mapping(address => mapping(uint8 => mapping(uint256 => bool)))) private _endorsed;

    event SkillRegistered(address indexed agent, uint8 indexed skillId);
    event SkillUnregistered(address indexed agent, uint8 indexed skillId);
    event Endorsed(address indexed endorser, address indexed target, uint8 indexed skillId);
    event Unendorsed(address indexed endorser, address indexed target, uint8 indexed skillId);

    /// @notice Gate Agent ID: pengirim wajib memegang Agent ID.
    modifier onlyAgentIdHolder() {
        require(registry.balanceOf(msg.sender) > 0, "AgentCraft: not an Agent ID holder");
        _;
    }

    constructor(address registry_) {
        require(registry_ != address(0), "AgentCraft: registry zero address");
        registry = IAgentIdRegistry(registry_);

        skills.push("Trading");
        skills.push("Coding");
        skills.push("Smart Contracts");
        skills.push("AI Agents");
        skills.push("Research");
        skills.push("Data Analysis");
        skills.push("Security");
        skills.push("Design");
        skills.push("Content");
        skills.push("Writing");
        skills.push("Video");
        skills.push("Music");
        skills.push("Marketing");
        skills.push("Social Media");
        skills.push("Community");
        skills.push("Gaming");
        skills.push("Business");
        skills.push("Support");
        skills.push("Translation");
        skills.push("Streaming");
    }

    /// @notice Jumlah skill dalam daftar tetap.
    function skillsCount() external view returns (uint256) {
        return skills.length;
    }

    /// @notice Daftarkan satu skill untuk alamat pengirim.
    function registerSkill(uint8 skillId) external onlyAgentIdHolder {
        require(skillId < skills.length, "AgentCraft: unknown skill");
        require(!hasSkill[msg.sender][skillId], "AgentCraft: skill already registered");

        hasSkill[msg.sender][skillId] = true;
        if (skillCountOf[msg.sender] == 0) {
            totalAgents += 1;
        }
        skillCountOf[msg.sender] += 1;

        emit SkillRegistered(msg.sender, skillId);
    }

    /// @notice Cabut satu skill. Endorsement yang diterima pada skill ini
    ///         direset (generasi naik): bila skill didaftarkan ulang,
    ///         endorsement dihitung dari nol dan endorser lama boleh
    ///         endorse lagi.
    function unregisterSkill(uint8 skillId) external onlyAgentIdHolder {
        require(hasSkill[msg.sender][skillId], "AgentCraft: skill not registered");

        hasSkill[msg.sender][skillId] = false;
        skillCountOf[msg.sender] -= 1;
        if (skillCountOf[msg.sender] == 0) {
            totalAgents -= 1;
        }
        skillGen[msg.sender][skillId] += 1;

        emit SkillUnregistered(msg.sender, skillId);
    }

    /// @notice Beri endorsement pada skill milik agen lain. Target wajib
    ///         sudah mendaftarkan skill itu; satu endorsement per
    ///         (endorser, target, skill); tidak bisa endorse diri sendiri.
    function endorse(address target, uint8 skillId) external onlyAgentIdHolder {
        require(target != msg.sender, "AgentCraft: cannot endorse yourself");
        require(skillId < skills.length, "AgentCraft: unknown skill");
        require(hasSkill[target][skillId], "AgentCraft: target has not registered this skill");

        uint256 gen = skillGen[target][skillId];
        require(!_endorsed[msg.sender][target][skillId][gen], "AgentCraft: already endorsed");

        _endorsed[msg.sender][target][skillId][gen] = true;
        _endoCount[target][skillId][gen] += 1;

        emit Endorsed(msg.sender, target, skillId);
    }

    /// @notice Tarik kembali endorsement yang pernah diberikan (pada generasi
    ///         skill target yang sedang berjalan).
    function unendorse(address target, uint8 skillId) external onlyAgentIdHolder {
        uint256 gen = skillGen[target][skillId];
        require(_endorsed[msg.sender][target][skillId][gen], "AgentCraft: not endorsed");

        _endorsed[msg.sender][target][skillId][gen] = false;
        _endoCount[target][skillId][gen] -= 1;

        emit Unendorsed(msg.sender, target, skillId);
    }

    /// @notice Daftar skillId yang sedang didaftarkan satu agen.
    function skillsOf(address agent) external view returns (uint8[] memory out) {
        out = new uint8[](skillCountOf[agent]);
        uint256 j = 0;
        for (uint256 i = 0; i < skills.length; i++) {
            if (hasSkill[agent][uint8(i)]) {
                out[j] = uint8(i);
                j += 1;
            }
        }
    }

    /// @notice Jumlah endorsement aktif yang diterima agen pada satu skill.
    function endorsementCount(address agent, uint8 skillId) external view returns (uint256) {
        return _endoCount[agent][skillId][skillGen[agent][skillId]];
    }

    /// @notice True bila `endorser` sedang meng-endorse skill `target`.
    function hasEndorsed(address endorser, address target, uint8 skillId) external view returns (bool) {
        return _endorsed[endorser][target][skillId][skillGen[target][skillId]];
    }
}
