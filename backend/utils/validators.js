const { AppError } = require("./errors");

const USER_ROLES = ["VIEWER", "ANALYST", "ADMIN"];
const USER_STATUSES = ["ACTIVE", "INACTIVE"];
const RECORD_TYPES = ["INCOME", "EXPENSE"];

const ensureObject = (value) => (value && typeof value === "object" ? value : {});

const ensureRequiredString = (value, field, { min = 1, max = 255 } = {}) => {
  const normalized = String(value || "").trim();

  if (!normalized) {
    throw new AppError(400, `${field} is required.`);
  }

  if (normalized.length < min || normalized.length > max) {
    throw new AppError(400, `${field} must be between ${min} and ${max} characters.`);
  }

  return normalized;
};

const ensureOptionalString = (value, field, { max = 255 } = {}) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value).trim();

  if (normalized.length > max) {
    throw new AppError(400, `${field} must be ${max} characters or fewer.`);
  }

  return normalized;
};

const ensureEmail = (value) => {
  const email = ensureRequiredString(value, "Email", { min: 5, max: 255 }).toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    throw new AppError(400, "Email must be a valid email address.");
  }

  return email;
};

const ensurePassword = (value) => {
  const password = ensureRequiredString(value, "Password", { min: 6, max: 100 });

  if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
    throw new AppError(400, "Password must contain at least one letter and one number.");
  }

  return password;
};

const ensureEnum = (value, field, values) => {
  const normalized =
    typeof value === "string" ? value.trim().toUpperCase() : value;

  if (!values.includes(normalized)) {
    throw new AppError(400, `${field} must be one of: ${values.join(", ")}.`);
  }

  return normalized;
};

const ensureDate = (value, field) => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, `${field} must be a valid date.`);
  }

  return parsed.toISOString().slice(0, 10);
};

const ensureNumber = (value, field, { min, max } = {}) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new AppError(400, `${field} must be a valid number.`);
  }

  if (min !== undefined && number < min) {
    throw new AppError(400, `${field} must be at least ${min}.`);
  }

  if (max !== undefined && number > max) {
    throw new AppError(400, `${field} must be at most ${max}.`);
  }

  return number;
};

const ensurePositiveInteger = (value, field, fallback) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number < 1) {
    throw new AppError(400, `${field} must be a positive integer.`);
  }

  return number;
};

const validateRegistration = (body) => {
  const payload = ensureObject(body);

  return {
    name: ensureRequiredString(payload.name, "Name", { min: 2, max: 100 }),
    email: ensureEmail(payload.email),
    password: ensurePassword(payload.password)
  };
};

const validateLogin = (body) => {
  const payload = ensureObject(body);

  return {
    email: ensureEmail(payload.email),
    password: ensureRequiredString(payload.password, "Password", { min: 6, max: 100 })
  };
};

const validateUserPayload = (body, { partial = false } = {}) => {
  const payload = ensureObject(body);
  const result = {};

  if (!partial || payload.name !== undefined) {
    result.name = ensureRequiredString(payload.name, "Name", { min: 2, max: 100 });
  }

  if (!partial || payload.email !== undefined) {
    result.email = ensureEmail(payload.email);
  }

  if (!partial || payload.password !== undefined) {
    result.password = ensurePassword(payload.password);
  }

  if (payload.role !== undefined) {
    result.role = ensureEnum(payload.role, "Role", USER_ROLES);
  }

  if (payload.status !== undefined) {
    result.status = ensureEnum(payload.status, "Status", USER_STATUSES);
  }

  return result;
};

const validateStatusPayload = (body) => {
  const payload = ensureObject(body);

  return {
    status: ensureEnum(payload.status, "Status", USER_STATUSES)
  };
};

const validateRecordPayload = (body, { partial = false } = {}) => {
  const payload = ensureObject(body);
  const result = {};

  if (!partial || payload.amount !== undefined) {
    result.amount = ensureNumber(payload.amount, "Amount", { min: 0.01 });
  }

  if (!partial || payload.type !== undefined) {
    result.type = ensureEnum(payload.type, "Type", RECORD_TYPES);
  }

  if (!partial || payload.category !== undefined) {
    result.category = ensureRequiredString(payload.category, "Category", { min: 2, max: 50 });
  }

  if (!partial || payload.date !== undefined) {
    result.date = ensureDate(payload.date, "Date");
  }

  if (!partial || payload.notes !== undefined) {
    result.notes = ensureOptionalString(payload.notes, "Notes", { max: 500 });
  }

  return result;
};

const validateRecordQuery = (query) => {
  const params = ensureObject(query);

  return {
    page: ensurePositiveInteger(params.page, "Page", 1),
    limit: ensurePositiveInteger(params.limit, "Limit", 10),
    type: params.type ? ensureEnum(params.type, "Type", RECORD_TYPES) : undefined,
    category: params.category ? String(params.category).trim() : undefined,
    startDate: params.startDate ? ensureDate(params.startDate, "Start date") : undefined,
    endDate: params.endDate ? ensureDate(params.endDate, "End date") : undefined,
    minAmount: params.minAmount !== undefined ? ensureNumber(params.minAmount, "Minimum amount", { min: 0 }) : undefined,
    maxAmount: params.maxAmount !== undefined ? ensureNumber(params.maxAmount, "Maximum amount", { min: 0 }) : undefined,
    search: params.search ? String(params.search).trim() : undefined
  };
};

module.exports = {
  USER_ROLES,
  USER_STATUSES,
  RECORD_TYPES,
  validateRegistration,
  validateLogin,
  validateUserPayload,
  validateStatusPayload,
  validateRecordPayload,
  validateRecordQuery
};
