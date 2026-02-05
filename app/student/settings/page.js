"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUserProfile, updateUserProfile, changePassword, uploadAvatar } from "@/lib/api-client";
import logger from "@/lib/logger";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function StudentSettingsPage() {
  const [user, setUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    studentId: "",
    institution: "",
    major: "",
  });

  // Password state
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const result = await getUserProfile();
      if (result.success && result.data) {
        const userData = result.data;
        setUser(userData);
        setAvatarUrl(userData.avatar_url);
        setFormData({
          fullName: userData.name || "",
          email: userData.email || "",
          studentId: userData.student_id || "",
          institution: userData.institution || "",
          major: userData.major || "",
        });
        localStorage.setItem("user", JSON.stringify(userData));
      } else {
        // Fallback to localStorage
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setFormData(prev => ({
            ...prev,
            fullName: userData.name || "",
            email: userData.email || "",
          }));
        }
      }
    } catch (error) {
      logger.error("Failed to load profile", error);
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setFormData(prev => ({
          ...prev,
          fullName: userData.name || "",
          email: userData.email || "",
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setSaveMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage({ type: 'error', text: 'Image must be less than 5MB' });
      return;
    }

    setIsUploadingAvatar(true);
    setSaveMessage(null);
    
    try {
      const result = await uploadAvatar(file);
      if (result.success) {
        setAvatarUrl(result.data.avatar_url);
        // Update localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          userData.avatar_url = result.data.avatar_url;
          localStorage.setItem('user', JSON.stringify(userData));
        }
        setSaveMessage({ type: 'success', text: 'Photo updated successfully!' });
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Failed to upload photo' });
      }
    } catch (error) {
      logger.error('Avatar upload error', error);
      setSaveMessage({ type: 'error', text: 'Failed to upload photo' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const result = await updateUserProfile({
        name: formData.fullName,
        student_id: formData.studentId,
        institution: formData.institution,
        major: formData.major,
      });
      if (result.success) {
        setSaveMessage({ type: 'success', text: 'Profile saved successfully!' });
        const updatedUser = { ...user, name: formData.fullName };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Failed to save profile' });
      }
    } catch (error) {
      logger.error("Failed to save profile", error);
      setSaveMessage({ type: 'error', text: 'Failed to save profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Current password is required' });
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (passwords.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    setIsChangingPassword(true);
    setPasswordMessage(null);
    try {
      const result = await changePassword(passwords.currentPassword, passwords.newPassword);
      if (result.success) {
        setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
      } else {
        setPasswordMessage({ type: 'error', text: result.error || 'Failed to change password' });
      }
    } catch (error) {
      logger.error("Failed to change password", error);
      setPasswordMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      {/* Profile Information Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Profile Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage your profile and account settings.</p>
      </div>

      {/* Profile Form Card */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-6 mb-6 sm:mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-6">Profile Information</h2>
        
        {/* Profile Photo Section */}
        <div className="flex items-center gap-4 mb-6 sm:mb-8">
          <div className="w-16 h-16 rounded-full bg-muted overflow-hidden flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={`${API_BASE_URL}${avatarUrl}`}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-semibold text-muted-foreground">
                {formData.fullName?.charAt(0)?.toUpperCase() || "?"}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-0.5">Profile Photo</h3>
            <p className="text-sm text-muted-foreground mb-1">Accepts JPG, GIF or PNG. Max 5MB.</p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="text-sm text-primary hover:text-primary/80 font-medium disabled:opacity-50"
            >
              {isUploadingAvatar ? "Uploading..." : "Change Photo"}
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Full Name
              </label>
              <Input
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Alex Morgan"
                className="h-11"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Input
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="alex.morgan@university.edu"
                  className="h-11 pr-24"
                  readOnly
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  Verified
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          {/* Student ID & Institution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Student ID
              </label>
              <Input
                name="studentId"
                value={formData.studentId}
                onChange={handleInputChange}
                placeholder="e.g. 20248891"
                className="h-11"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Institution
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <Input
                  name="institution"
                  value={formData.institution}
                  onChange={handleInputChange}
                  placeholder="University Name"
                  className="h-11 pl-10"
                />
              </div>
            </div>
          </div>

          {/* Major / Program */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Major / Program
            </label>
            <Input
              name="major"
              value={formData.major}
              onChange={handleInputChange}
              placeholder="e.g. Computer Science, B.S."
              className="h-11"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-3 mt-8 pt-6 border-t border-border">
          {saveMessage && (
            <div className={`text-sm font-medium ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage.text}
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="px-6">
              Cancel
            </Button>
            <Button 
              onClick={handleSaveChanges} 
              disabled={isSaving}
              className="px-6 bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">Change Password</h2>
        
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Current Password
            </label>
            <Input
              type="password"
              name="currentPassword"
              value={passwords.currentPassword}
              onChange={handlePasswordChange}
              placeholder="Enter current password"
              className="h-11"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              New Password
            </label>
            <Input
              type="password"
              name="newPassword"
              value={passwords.newPassword}
              onChange={handlePasswordChange}
              placeholder="Enter new password"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground mt-1">Must be at least 8 characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Confirm New Password
            </label>
            <Input
              type="password"
              name="confirmPassword"
              value={passwords.confirmPassword}
              onChange={handlePasswordChange}
              placeholder="Confirm new password"
              className="h-11"
            />
          </div>
          
          <div className="flex items-center gap-4 pt-2">
            <Button 
              onClick={handleChangePassword}
              disabled={isChangingPassword}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isChangingPassword ? "Updating..." : "Update Password"}
            </Button>
            {passwordMessage && (
              <span className={`text-sm font-medium ${passwordMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {passwordMessage.text}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
