const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const config = require('./config');
const { tokenTypes } = require('./tokens');
const { User } = require('../models');

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

const jwtVerify = async (payload, done) => {
  try {
    if (payload.type !== tokenTypes.ACCESS) {
      throw new Error('Invalid token type');
    }
    const user = await User.findById(payload.sub);
    if (!user) {
      return done(null, false);
    }
    // 强制登出判定：检查 JWT 签发时间是否早于强制登出时间点
    if (user.forceLogoutAt && payload.iat) {
      const tokenIatMs = payload.iat * 1000;
      const logoutMs = new Date(user.forceLogoutAt).getTime();
      // 如果 token 签发时间早于强制登出时间，直接拒绝认证，触发 401
      if (tokenIatMs < logoutMs) {
        return done(null, false);
      }
    }
    done(null, user);
  } catch (error) {
    done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

module.exports = {
  jwtStrategy,
};
