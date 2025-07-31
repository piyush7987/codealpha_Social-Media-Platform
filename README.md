# Social Media Platform

A mini social media application built with modern web technologies, featuring user profiles, posts, comments, and social interactions.

## 🚀 Features

- **User Authentication**: Sign up, login, and secure sessions
- **User Profiles**: Customizable profiles with bio, avatar, and stats
- **Posts & Comments**: Create, edit, and delete posts with nested comments
- **Social Interactions**: Like posts/comments and follow other users
- **Real-time Updates**: Dynamic content loading without page refresh
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🛠 Tech Stack

**Frontend:**
- HTML5 - Semantic markup structure
- CSS3 - Modern styling with Flexbox/Grid
- JavaScript (ES6+) - Interactive functionality and API calls

**Backend:**
- Node.js - Runtime environment
- Express.js - Web application framework
- JWT - Authentication tokens
- bcryptjs - Password hashing

**Database:**
- MongoDB with Mongoose - Document database for flexible data storage
- Alternative: PostgreSQL with Sequelize for relational data

## 📁 Project Structure

```
social-media-platform/
├── frontend/
│   ├── index.html
│   ├── css/
│   │   ├── styles.css
│   │   └── responsive.css
│   ├── js/
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── posts.js
│   │   └── utils.js
│   └── assets/
│       └── images/
├── backend/
│   ├── server.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Post.js
│   │   └── Comment.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── posts.js
│   │   └── comments.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── validation.js
│   └── config/
│       └── database.js
├── package.json
├── .env
├── .gitignore
└── README.md
```

## 🗄 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  profile: {
    displayName: String,
    bio: String,
    avatar: String,
    joinDate: Date
  },
  followers: [ObjectId],
  following: [ObjectId],
  stats: {
    postsCount: Number,
    followersCount: Number,
    followingCount: Number
  }
}
```

### Posts Collection
```javascript
{
  _id: ObjectId,
  author: ObjectId (ref: User),
  content: String,
  images: [String],
  likes: [ObjectId],
  comments: [ObjectId],
  createdAt: Date,
  updatedAt: Date,
  stats: {
    likesCount: Number,
    commentsCount: Number
  }
}
```

### Comments Collection
```javascript
{
  _id: ObjectId,
  post: ObjectId (ref: Post),
  author: ObjectId (ref: User),
  content: String,
  likes: [ObjectId],
  parentComment: ObjectId (for nested comments),
  createdAt: Date,
  stats: {
    likesCount: Number
  }
}
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB installed locally or MongoDB Atlas account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/social-media-platform.git
   cd social-media-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/socialmedia
   JWT_SECRET=your_super_secret_jwt_key_here
   NODE_ENV=development
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📦 Dependencies

### Backend Dependencies
```json
{
  "express": "^4.18.2",
  "mongoose": "^7.5.0",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "express-validator": "^7.0.1",
  "multer": "^1.4.5",
  "helmet": "^7.0.0"
}
```

### Development Dependencies
```json
{
  "nodemon": "^3.0.1",
  "concurrently": "^8.2.0"
}
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `POST /api/users/:id/follow` - Follow user
- `DELETE /api/users/:id/follow` - Unfollow user
- `GET /api/users/:id/followers` - Get user followers
- `GET /api/users/:id/following` - Get users being followed

### Posts
- `GET /api/posts` - Get all posts (with pagination)
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create new post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like/unlike post

### Comments
- `GET /api/posts/:postId/comments` - Get post comments
- `POST /api/posts/:postId/comments` - Add comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment
- `POST /api/comments/:id/like` - Like/unlike comment

## 💡 Development Tips

### Debugging Common Issues

1. **CORS Errors**: Make sure CORS is properly configured in your Express server
2. **Authentication Issues**: Check JWT token expiration and storage
3. **Database Connection**: Verify MongoDB is running and connection string is correct
4. **API Errors**: Use browser dev tools Network tab to inspect requests/responses

### Best Practices

- **Security**: Always validate and sanitize user input
- **Performance**: Implement pagination for posts and comments
- **User Experience**: Add loading states and error handling
- **Code Organization**: Keep components modular and reusable
- **Testing**: Write unit tests for critical functionality

## 🎨 Frontend Implementation Guide

### Key JavaScript Functions to Implement

```javascript
// Authentication
async function login(email, password)
async function register(userData)
async function logout()

// Posts
async function loadPosts(page = 1)
async function createPost(content, images)
async function likePost(postId)
async function deletePost(postId)

// Comments
async function loadComments(postId)
async function addComment(postId, content)
async function likeComment(commentId)

// Users
async function followUser(userId)
async function loadUserProfile(userId)
async function updateProfile(profileData)
```

### CSS Classes Structure
```css
/* Layout */
.container, .header, .sidebar, .main-content, .footer

/* Components */
.post-card, .comment-item, .user-profile, .modal

/* Interactive */
.btn, .btn-primary, .btn-secondary, .like-btn, .follow-btn

/* States */
.loading, .error, .success, .active, .disabled
```

## 🚀 Deployment

### Environment Setup
1. **Production Database**: Set up MongoDB Atlas or your preferred database
2. **Environment Variables**: Update `.env` for production values
3. **Build Process**: Optimize and minify frontend assets

### Deployment Options
- **Heroku**: Easy deployment with Git integration
- **Vercel**: Great for frontend with serverless functions
- **DigitalOcean**: Full server control with droplets
- **Netlify**: Static site hosting with serverless functions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/social-media-platform/issues) page
2. Create a new issue with detailed description
3. Include error messages and steps to reproduce

## 🔮 Future Enhancements

- [ ] Real-time messaging system
- [ ] Image/video upload with cloud storage
- [ ] Push notifications
- [ ] Advanced search and filtering
- [ ] Mobile app with React Native
- [ ] Admin dashboard
- [ ] Content moderation tools
- [ ] Analytics and insights

---

**Happy Coding! 🎉**

Built with ❤️ by [Your Name]