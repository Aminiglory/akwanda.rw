const mongoose = require('mongoose');

const FlightsPageContentSchema = new mongoose.Schema(
  {
    pageTitle: { type: String, default: '' },
    introText: { type: String, default: '' },
    heroImages: [{ type: String }],
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FlightsPageContent', FlightsPageContentSchema);
