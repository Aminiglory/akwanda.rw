const mongoose = require('mongoose');

const SectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    images: [{ type: String }]
  },
  { _id: false }
);

const HeroSlideSchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    caption: { type: String, default: '' }
  },
  { _id: false }
);

const LandingContentSchema = new mongoose.Schema(
  {
    heroTitle: { type: String, default: '' },
    heroSubtitle: { type: String, default: '' },
    heroImages: [{ type: String }],
    heroSlides: [HeroSlideSchema],
    heroTransition: { type: String, enum: ['fade', 'slide'], default: 'fade' },
    heroIntervalMs: { type: Number, default: 5000 },
    sections: [SectionSchema],
    published: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('LandingContent', LandingContentSchema);
