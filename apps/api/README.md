# Multi-Tenant Ecommerce Platform - Spring Boot Backend

A modern multi-tenant ecommerce platform built with Spring Boot, featuring subdomain-based tenant isolation, OAuth2 authentication, product management, and role-based authorization.

## Features

- **Multi-Tenant Architecture**: Subdomain-based tenant isolation (e.g., electronics.esy.ge, fashion.esy.ge)
- **Product Management**: CRUD operations for products with pagination support for infinite scroll
- **OAuth2 Authentication**: Google and Apple sign-in integration with tenant-aware redirects
- **Role-based Authorization**: Admin and user roles with different permissions per tenant
- **RESTful API**: Clean REST endpoints for frontend integration
- **JWT Security**: Stateless authentication with JWT tokens
- **Lombok Integration**: Reduced boilerplate code with Lombok annotations
- **Database**: H2 in-memory database for development (easily configurable for PostgreSQL)

## Multi-Tenant Architecture

The platform supports multiple ecommerce stores through subdomain-based tenant isolation:

- **main.esy.ge** - Main ecommerce store
- **electronics.esy.ge** - Electronics and gadgets store  
- **fashion.esy.ge** - Fashion and clothing store
- **{subdomain}.esy.ge** - Any custom subdomain

Each tenant has:
- Isolated product catalogs
- Separate user bases
- Independent OAuth2 authentication flows
- Custom branding (colors, logos, etc.)

## API Endpoints

### Products (Tenant-aware)
- `GET /api/products` - Get paginated list of products for current tenant
- `GET /api/products/{id}` - Get product details (tenant-scoped)
- `POST /api/products` - Create product (Admin only, tenant-scoped)
- `PUT /api/products/{id}` - Update product (Admin only, tenant-scoped)
- `DELETE /api/products/{id}` - Delete product (Admin only, tenant-scoped)

### Tenant Information
- `GET /api/tenant/current` - Get current tenant information
- `GET /api/tenant/subdomain` - Get current subdomain

### Authentication (Tenant-aware)
- `GET /api/auth/user` - Get current user info (tenant-scoped)
- `POST /api/auth/token` - Generate JWT token
- `POST /api/auth/logout` - Logout user

### OAuth2 (Tenant-aware)
- `/login/oauth2/google` - Google OAuth2 login (redirects to tenant subdomain)
- `/login/oauth2/apple` - Apple OAuth2 login (redirects to tenant subdomain)

## Setup Instructions

### 1. Prerequisites
- Java 17 or higher
- Maven 3.6 or higher

### 2. Environment Variables
Create a `.env` file or set the following environment variables:

```bash
# OAuth2 Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_CLIENT_SECRET=your-apple-client-secret

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-at-least-256-bits

# Database (optional - defaults to H2)
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/ecommerce
SPRING_DATASOURCE_USERNAME=your-db-username
SPRING_DATASOURCE_PASSWORD=your-db-password
```

### 3. OAuth2 Setup

#### Google OAuth2 Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client IDs
5. Set authorized redirect URIs: `http://localhost:8080/login/oauth2/code/google`
6. Copy Client ID and Client Secret

#### Apple OAuth2 Setup:
1. Go to [Apple Developer Console](https://developer.apple.com/)
2. Create a new App ID
3. Configure Sign in with Apple
4. Set redirect URL: `http://localhost:8080/login/oauth2/code/apple`
5. Copy Client ID and Client Secret

### 4. Running the Application

```bash
# Clone the repository
git clone <repository-url>
cd EsyBack

# Run with Maven
mvn spring-boot:run

# Or build and run JAR
mvn clean package
java -jar target/ecommerce-platform-0.0.1-SNAPSHOT.jar
```

The application will start on `http://localhost:8080`

### 5. Database Access
- H2 Console: `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:mem:testdb`
- Username: `sa`
- Password: `password`

## API Usage Examples

### Get Products with Pagination (Infinite Scroll)
```bash
curl "http://localhost:8080/api/products?page=0&size=20&sortBy=id&sortDir=asc"
```

### Get Product Details
```bash
curl "http://localhost:8080/api/products/1"
```

### Multi-Tenant OAuth2 Login Flow
1. Redirect user to: `https://electronics.esy.ge/login/oauth2/google`
2. After successful authentication, user will be redirected to: `https://electronics.esy.ge/auth/callback?token=<jwt-token>`
3. Use the JWT token in subsequent API calls: `Authorization: Bearer <jwt-token>`
4. Each subdomain maintains its own user base and product catalog

### Get Current User
```bash
curl -H "Authorization: Bearer <jwt-token>" "http://localhost:8080/api/auth/user"
```

## Project Structure

```
src/main/java/com/esyback/ecommerce/
├── config/                 # Configuration classes
├── controller/             # REST controllers
├── dto/                   # Data Transfer Objects
├── entity/                # JPA entities
├── repository/            # Data repositories
├── security/              # Security configuration
└── service/               # Business logic services
```

## Technologies Used

- **Spring Boot 3.2.0**
- **Spring Security** - Authentication and authorization
- **Spring Data JPA** - Database operations
- **OAuth2 Client** - Google and Apple authentication
- **JWT** - Token-based authentication
- **Lombok** - Reduced boilerplate code
- **Multi-Tenant Architecture** - Subdomain-based tenant isolation
- **H2 Database** - In-memory database for development
- **Maven** - Dependency management

## Development Notes

- The application uses H2 in-memory database by default for easy development
- Sample tenants (main, electronics, fashion) are created automatically
- Sample products are automatically created for each tenant on startup
- Default roles (USER, ADMIN) are created automatically
- CORS is configured for esy.ge subdomains and localhost development
- JWT tokens expire after 24 hours by default
- Each tenant maintains isolated data and user bases

## Production Considerations

- Use PostgreSQL or MySQL for production database
- Set up proper CORS configuration for production domains
- Use environment-specific OAuth2 credentials
- Implement proper logging and monitoring
- Set up SSL/TLS certificates
- Configure proper JWT secret key management
