const asyncHandler = require("../utils/asyncHandler");
const recordService = require("../services/recordService");
const {
  validateRecordPayload,
  validateRecordQuery
} = require("../utils/validators");

exports.createRecord = asyncHandler(async (req, res) => {
  const payload = validateRecordPayload(req.body);
  const record = await recordService.createRecord({
    ...payload,
    userId: req.user.id
  });

  res.status(201).json(record);
});

exports.getRecords = asyncHandler(async (req, res) => {
  const filters = validateRecordQuery(req.query);
  const result = await recordService.getAllRecords(filters, req.user);
  res.json(result);
});

exports.getRecordById = asyncHandler(async (req, res) => {
  const record = await recordService.findRecordById(req.params.id, req.user);
  res.json(record);
});

exports.updateRecord = asyncHandler(async (req, res) => {
  const payload = validateRecordPayload(req.body, { partial: true });
  const record = await recordService.updateRecord(req.params.id, payload, req.user);
  res.json(record);
});

exports.deleteRecord = asyncHandler(async (req, res) => {
  await recordService.deleteRecord(req.params.id, req.user);
  res.json({ message: "Record deleted successfully." });
});
