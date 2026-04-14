const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema(
  {
    photoNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    publicId: {
      type: String,
      required: true,
      unique: true,
    },
    url: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      default: '',
    },
    format: {
      type: String,
      default: 'jpg',
    },
    width: Number,
    height: Number,
    size: Number,
    uploadedBy: {
      type: String,
      default: 'admin',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate photoNumber before save
photoSchema.pre('save', async function (next) {
  if (!this.photoNumber) {
    const count = await mongoose.model('Photo').countDocuments();
    const num = String(count + 1).padStart(1, '0');
    this.photoNumber = `ECE${num}`;
  }
  next();
});

module.exports = mongoose.model('Photo', photoSchema);
