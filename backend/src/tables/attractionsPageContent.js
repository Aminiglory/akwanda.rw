const mongoose = require('mongoose');

const AttractionItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    shortDesc: { type: String, default: '' },
    image: { type: String, default: '' },
    linkUrl: { type: String, default: '' }
  },
  { _id: false }
);

const AttractionsPageContentSchema = new mongoose.Schema(
  {
    pageTitle: { type: String, default: '' },
    introText: { type: String, default: '' },
    heroImages: [{ type: String }],
    attractions: [AttractionItemSchema],
    published: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AttractionsPageContent', AttractionsPageContentSchema);
