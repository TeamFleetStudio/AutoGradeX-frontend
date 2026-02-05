"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserProfile, updateUserProfile, changePassword, uploadAvatar } from "@/lib/api-client";
import logger from "@/lib/logger";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function InstructorSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // Profile form state
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    title: "",
    department: "",
    institution: "",
    officeHours: "",
  });

  // Password form state
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    setIsLoading(true);
    try {
      const result = await getUserProfile();
      if (result.success && result.data) {
        const userData = result.data;
        setUser(userData);
        setAvatarUrl(userData.avatar_url);
        setProfile({
          fullName: userData.name || "",
          email: userData.email || "",
          title: userData.title || "",
          department: userData.department || "",
          institution: userData.institution || "",
          officeHours: userData.office_hours || "",
        });
        // Also update localStorage
        localStorage.setItem("user", JSON.stringify(userData));
      } else {
        // Fallback to localStorage
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setProfile({
            fullName: userData.name || "",
            email: userData.email || "",
            title: userData.title || "",
            department: userData.department || "",
            institution: userData.institution || "",
            officeHours: userData.office_hours || "",
          });
        }
      }
    } catch (error) {
      logger.error("Failed to load settings data", error);
      // Fallback to localStorage
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setProfile({
          fullName: userData.name || "",
          email: userData.email || "",
          title: "",
          department: "",
          institution: "",
          officeHours: "",
        });
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

  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswords((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const result = await updateUserProfile({
        name: profile.fullName,
        title: profile.title,
        department: profile.department,
        institution: profile.institution,
        office_hours: profile.officeHours,
      });
      if (result.success) {
        setSaveMessage({ type: 'success', text: 'Profile saved successfully!' });
        // Update localStorage
        const updatedUser = { ...user, name: profile.fullName };
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
    if (passwords.newPassword !== passwords.confirmPassword) {
      setSaveMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (passwords.newPassword.length < 8) {
      setSaveMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const result = await changePassword(passwords.currentPassword, passwords.newPassword);
      if (result.success) {
        setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setSaveMessage({ type: 'success', text: 'Password changed successfully!' });
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Failed to change password' });
      }
    } catch (error) {
      logger.error("Failed to change password", error);
      setSaveMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: "user" },
  ];

  const renderTabIcon = (icon) => {
    switch (icon) {
      case "user":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case "shield":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case "sliders":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        );
      case "bell":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
      case "puzzle":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <>
        {/* Header */}
        <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

        {/* Tabs */}
        <div className="border-b border-border mb-8">
          <nav className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {renderTabIcon(tab.icon)}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
              <Skeleton className="h-8 w-48 mb-6" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
                <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                  {/* Profile Photo */}
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-muted mb-3 bg-muted flex items-center justify-center">
                      {avatarUrl ? (
                        <img
                          src={`${API_BASE_URL}${avatarUrl}`}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl font-semibold text-muted-foreground">
                          {profile.fullName?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
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

                  {/* Form Fields */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Full Name */}
                    <div>
                      <Label htmlFor="fullName" className="text-sm font-medium text-foreground mb-2 block">
                        Full Name
                      </Label>
                      <Input
                        id="fullName"
                        value={profile.fullName}
                        onChange={(e) => handleProfileChange("fullName", e.target.value)}
                        className="bg-muted border-border"
                      />
                    </div>

                    {/* Email Address */}
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium text-foreground mb-2 block">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Input
                          id="email"
                          value={profile.email}
                          onChange={(e) => handleProfileChange("email", e.target.value)}
                          className="bg-muted border-border pr-24"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-green-600 text-xs font-medium">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Verified
                        </span>
                      </div>
                    </div>

                    {/* Title / Position */}
                    <div>
                      <Label htmlFor="title" className="text-sm font-medium text-foreground mb-2 block">
                        Title / Position
                      </Label>
                      <Input
                        id="title"
                        value={profile.title}
                        onChange={(e) => handleProfileChange("title", e.target.value)}
                        className="bg-muted border-border"
                      />
                    </div>

                    {/* Department */}
                    <div>
                      <Label htmlFor="department" className="text-sm font-medium text-foreground mb-2 block">
                        Department
                      </Label>
                      <Input
                        id="department"
                        value={profile.department}
                        onChange={(e) => handleProfileChange("department", e.target.value)}
                        className="bg-muted border-border"
                      />
                    </div>

                    {/* Institution */}
                    <div>
                      <Label htmlFor="institution" className="text-sm font-medium text-foreground mb-2 block">
                        Institution
                      </Label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded bg-muted flex items-center justify-center">
                          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <Input
                          id="institution"
                          value={profile.institution}
                          onChange={(e) => handleProfileChange("institution", e.target.value)}
                          className="bg-muted border-border pl-12"
                        />
                      </div>
                    </div>

                    {/* Office Hours */}
                    <div>
                      <Label htmlFor="officeHours" className="text-sm font-medium text-foreground mb-2 block">
                        Office Hours
                      </Label>
                      <Input
                        id="officeHours"
                        value={profile.officeHours}
                        onChange={(e) => handleProfileChange("officeHours", e.target.value)}
                        className="bg-muted border-border"
                      />
                    </div>

                    {/* Change Password */}
                    <div className="col-span-1 sm:col-span-2 pt-4 mt-4 border-t border-border">
                      <h3 className="text-sm font-semibold text-foreground mb-4">Change Password</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="currentPasswordProfile" className="text-sm font-medium text-foreground mb-2 block">
                            Current Password
                          </Label>
                          <Input
                            id="currentPasswordProfile"
                            type="password"
                            value={passwords.currentPassword}
                            onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                            className="bg-muted border-border"
                            placeholder="••••••••"
                          />
                        </div>
                        <div>
                          <Label htmlFor="newPasswordProfile" className="text-sm font-medium text-foreground mb-2 block">
                            New Password
                          </Label>
                          <Input
                            id="newPasswordProfile"
                            type="password"
                            value={passwords.newPassword}
                            onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                            className="bg-muted border-border"
                            placeholder="••••••••"
                          />
                        </div>
                        <div>
                          <Label htmlFor="confirmPasswordProfile" className="text-sm font-medium text-foreground mb-2 block">
                            Confirm Password
                          </Label>
                          <Input
                            id="confirmPasswordProfile"
                            type="password"
                            value={passwords.confirmPassword}
                            onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                            className="bg-muted border-border"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button
                          onClick={handleChangePassword}
                          disabled={isSaving || !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword}
                          variant="outline"
                          className="border-border"
                        >
                          {isSaving ? "Updating..." : "Update Password"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-4 mt-6 pt-6 border-t border-border">
                  {saveMessage && (
                    <div className={`text-sm font-medium ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {saveMessage.text}
                    </div>
                  )}
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            )}


          </>
        )}
      </>
  );
}
