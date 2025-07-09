const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false, // Don't include password in queries by default
  },
  isAdmin: {
    type: Boolean,
    default: false, // More secure default
  },
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'pending'],
    default: 'active'
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  }
}, { 
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// Remove duplicate index - only use schema.index()
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to handle password hashing if needed
userSchema.pre('save', function(next) {
  // Update lastLogin if this is a login operation
  if (this.isModified('lastLogin')) {
    this.loginAttempts = 0;
    this.lockUntil = undefined;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
