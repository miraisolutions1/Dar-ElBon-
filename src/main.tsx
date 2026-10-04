import { DrinksMenu } from './drinks-menu';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '@fontsource-variable/noto-sans-arabic';
import '@fontsource-variable/noto-naskh-arabic';
import '@fontsource-variable/cairo';
import './styles.css';
import './storefront-theme.css';
import './header-theme.css';
import { StoreProvider, CartProvider } from './lib';
import {
  StoreLayout,
  Home,
  Shop,
  ProductPage,
  CartPage,
  Checkout,
  OrderPage,
  Guide,
  QuizPage,
  BlendPage,
  RecipesPage,
  About,
  BranchesPage,
  Policy,
  NotFound,
} from './storefront';
import {
  Login,
  AdminShell,
  Dashboard,
  Orders,
  OrderDetail,
  Products,
  ProductEditor,
  SettingsPage,
  UsersPage,
  AuditPage,
  AccountPage,
} from './admin';
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="loading-page">
        <h1>تعذر عرض الصفحة</h1>
        <p>حدّث الصفحة وحاول مرة أخرى.</p>
        <button className="btn" onClick={() => location.reload()}>
          إعادة التحميل
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <BrowserRouter>
      <StoreProvider>
        <CartProvider>
          <Routes>
            <Route element={<StoreLayout />}>
              <Route index element={<Home />} />
              <Route path="shop" element={<Shop />} />
              <Route path="menu" element={<DrinksMenu />} />
              <Route path="products/:slug" element={<ProductPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="order/:token" element={<OrderPage />} />
              <Route path="guide" element={<Guide />} />
              <Route path="quiz" element={<QuizPage />} />
              <Route path="blend" element={<BlendPage />} />
              <Route path="learn" element={<RecipesPage />} />
              <Route path="about" element={<About />} />
              <Route path="branches" element={<BranchesPage />} />
              <Route path="policies/:type" element={<Policy />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="admin/login" element={<Login />} />
            <Route path="admin" element={<AdminShell />}>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:id" element={<OrderDetail />} />
              <Route path="products" element={<Products />} />
              <Route path="products/:id" element={<ProductEditor />} />
              <Route path="content" element={<SettingsPage contentOnly />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="account" element={<AccountPage />} />
            </Route>
          </Routes>
        </CartProvider>
      </StoreProvider>
    </BrowserRouter>
  </ErrorBoundary>,
);
