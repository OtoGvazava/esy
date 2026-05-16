import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AuthProvider } from '../contexts/AuthContext';
import { AdminProvider } from '../contexts/AdminContext';
import Admin from '../pages/Admin';
import AdminDashboard from '../components/admin/AdminDashboard';
import ProductForm from '../components/admin/ProductForm';

// Mock theme
const theme = createTheme();

// Test wrapper component
const TestWrapper = ({ children, userRole = 'user' }) => {
  const mockUser = {
    id: 'test-user',
    name: 'Test User',
    email: 'test@example.com',
    role: userRole
  };

  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <AdminProvider>
            {children}
          </AdminProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Admin Functionality Tests', () => {
  test('Admin page shows access denied for non-admin users', () => {
    render(
      <TestWrapper userRole="user">
        <Admin />
      </TestWrapper>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText("You don't have admin permissions to access this page.")).toBeInTheDocument();
  });

  test('Admin page shows dashboard for admin users', () => {
    render(
      <TestWrapper userRole="admin">
        <Admin />
      </TestWrapper>
    );

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Manage your products and inventory')).toBeInTheDocument();
  });

  test('Admin dashboard shows statistics cards', () => {
    render(
      <TestWrapper userRole="admin">
        <AdminDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Total Products')).toBeInTheDocument();
    expect(screen.getByText('Active Products')).toBeInTheDocument();
    expect(screen.getByText('Total Value')).toBeInTheDocument();
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
  });

  test('Product form opens and closes correctly', async () => {
    const mockOnClose = jest.fn();
    const mockOnSubmit = jest.fn();

    render(
      <TestWrapper userRole="admin">
        <ProductForm
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Product"
        />
      </TestWrapper>
    );

    expect(screen.getByText('Add Product')).toBeInTheDocument();
    expect(screen.getByText('Product Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();

    // Test form validation
    const submitButton = screen.getByText('Add Product');
    fireEvent.click(submitButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });
  });

  test('Product form validates required fields', async () => {
    const mockOnSubmit = jest.fn();

    render(
      <TestWrapper userRole="admin">
        <ProductForm
          open={true}
          onClose={jest.fn()}
          onSubmit={mockOnSubmit}
          title="Add Product"
        />
      </TestWrapper>
    );

    const submitButton = screen.getByText('Add Product');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
      expect(screen.getByText('Valid price is required')).toBeInTheDocument();
    });
  });

  test('Product form accepts valid input', async () => {
    const mockOnSubmit = jest.fn();

    render(
      <TestWrapper userRole="admin">
        <ProductForm
          open={true}
          onClose={jest.fn()}
          onSubmit={mockOnSubmit}
          title="Add Product"
        />
      </TestWrapper>
    );

    // Fill out the form
    fireEvent.change(screen.getByLabelText('Product Title'), {
      target: { value: 'Test Product' }
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Test Description' }
    });
    fireEvent.change(screen.getByLabelText('Price'), {
      target: { value: '99.99' }
    });
    fireEvent.change(screen.getByLabelText('Stock Quantity'), {
      target: { value: '10' }
    });
    fireEvent.change(screen.getByLabelText('Brand'), {
      target: { value: 'Test Brand' }
    });

    // Select category
    fireEvent.mouseDown(screen.getByLabelText('Category'));
    fireEvent.click(screen.getByText('Electronics'));

    const submitButton = screen.getByText('Add Product');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        stock: 10,
        category: 'Electronics',
        brand: 'Test Brand',
        status: 'active',
        images: []
      });
    });
  });
});

// Integration tests
describe('Admin Integration Tests', () => {
  test('Complete admin workflow', async () => {
    render(
      <TestWrapper userRole="admin">
        <AdminDashboard />
      </TestWrapper>
    );

    // Should show admin dashboard
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();

    // Should show add product button
    expect(screen.getByText('Add Product')).toBeInTheDocument();

    // Click add product button
    fireEvent.click(screen.getByText('Add Product'));

    // Should open product form
    await waitFor(() => {
      expect(screen.getByText('Add New Product')).toBeInTheDocument();
    });
  });
});

