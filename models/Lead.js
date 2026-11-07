const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 150 },
  phone: { type: String, trim: true, maxlength: 20 },
  company: { type: String, trim: true, maxlength: 100 },
  industry: { type: String, trim: true, maxlength: 100 },
  notes: { type: String, maxlength: 2000, default: '' },
  ai: { category: String, priority: String, summary: String },
  budget: { type: String, enum: ['<1k', '1k-5k', '5k-20k', '20k+', ''], default: '' },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new' }
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);