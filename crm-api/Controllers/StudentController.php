<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RoleMiddleware;
use TGA\CRM\Models\Application;
use TGA\CRM\Models\Notification;
use TGA\CRM\Models\StudentProfile;

final class StudentController extends BaseController
{
    private StudentProfile $profiles;
    private Application $applications;
    private Notification $notifications;

    public function __construct()
    {
        $this->profiles = new StudentProfile();
        $this->applications = new Application();
        $this->notifications = new Notification();
    }

    public function getProfile(): void
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['student']);

        $profile = $this->profiles->findByUserId((int) $user['sub']);

        if ($profile === null) {
            Response::error('Student profile not found', 'RESOURCE_NOT_FOUND', 404);
        }

        Response::success('Profile fetched successfully', [
            'profile' => $profile,
        ]);
    }

    public function updateProfile(): void
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['student']);

        $input = $this->getJsonInput();
        $updatedProfile = $this->profiles->updateByUserId((int) $user['sub'], $input);

        Response::success('Profile updated successfully', [
            'profile' => $updatedProfile,
        ]);
    }

    public function getDashboard(): void
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['student']);

        $profile = $this->profiles->findByUserId((int) $user['sub']);

        if ($profile === null) {
            Response::error('Student profile not found', 'RESOURCE_NOT_FOUND', 404);
        }

        Response::success('Dashboard fetched successfully', [
            'stats' => [
                'profileCompletion' => (int) ($profile['profile_completion'] ?? 0),
                'points' => (int) ($profile['gamification_points'] ?? 0),
                'applicationCount' => $this->applications->countForStudent((int) $user['sub']),
                'recentApplications' => $this->applications->listForStudent((int) $user['sub'], 5),
                'unreadNotifications' => $this->notifications->countUnread((int) $user['sub']),
            ],
        ]);
    }

    public function getApplications(): void
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['student']);

        $applications = $this->applications->listForStudent((int) $user['sub']);

        Response::success('Applications fetched successfully', [
            'applications' => $applications,
        ]);
    }

    public function getNotifications(): void
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['student']);

        Response::success('Notifications fetched successfully', [
            'notifications' => $this->notifications->listForUser((int) $user['sub']),
            'unreadCount' => $this->notifications->countUnread((int) $user['sub']),
        ]);
    }
}
