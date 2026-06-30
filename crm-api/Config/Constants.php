<?php

declare(strict_types=1);

namespace TGA\CRM\Config;

final class Constants
{
    public const ROLES = [
        'student',
        'agent',
        'sub_agent',
        'counsellor',
        'visa_officer',
        'admin',
        'super_admin',
    ];

    public const INTERNAL_ROLES = [
        'counsellor',
        'visa_officer',
        'admin',
        'super_admin',
    ];

    public const ADMIN_PANEL_ROLES = [
        'counsellor',
        'visa_officer',
        'admin',
        'super_admin',
    ];

    public const DOCUMENT_REVIEW_ROLES = [
        'visa_officer',
        'admin',
        'super_admin',
    ];

    public const APPLICATION_STATUSES = [
        'inquiry',
        'profile_review',
        'applied',
        'documents_submitted',
        'under_review',
        'offer_received',
        'conditional_offer',
        'unconditional_offer',
        'enrolled',
        'cas_coe_issued',
        'visa_applied',
        'visa_approved',
        'visa_rejected',
        'pre_departure',
        'departed',
        'deferred',
        'withdrawn',
        'rejected',
    ];

    public const APPLICATION_PRIORITIES = [
        'normal',
        'high',
        'urgent',
    ];

    public const USER_STATUSES = [
        'active',
        'suspended',
        'pending',
        'deleted',
    ];

    public const INTERNAL_ASSIGNABLE_ROLES = [
        'counsellor',
        'visa_officer',
        'admin',
        'super_admin',
    ];

    public const INTERNAL_MUTABLE_ROLES = [
        'admin',
        'counsellor',
        'visa_officer',
    ];

    public const STAGE_PERMISSIONS = [
        'counsellor' => [
            'inquiry',
            'profile_review',
            'applied',
            'documents_submitted',
            'under_review',
            'conditional_offer',
            'unconditional_offer',
            'offer_received',
            'enrolled',
            'deferred',
            'withdrawn',
            'rejected',
        ],
        'visa_officer' => [
            'cas_coe_issued',
            'visa_applied',
            'visa_approved',
            'visa_rejected',
            'pre_departure',
            'departed',
        ],
        'admin' => self::APPLICATION_STATUSES,
        'super_admin' => self::APPLICATION_STATUSES,
    ];

    public const AUTH_ERROR_CODES = [
        'missing' => 'AUTH_TOKEN_MISSING',
        'expired' => 'AUTH_TOKEN_EXPIRED',
        'invalid' => 'AUTH_TOKEN_INVALID',
        'role' => 'AUTH_INSUFFICIENT_ROLE',
    ];
}
