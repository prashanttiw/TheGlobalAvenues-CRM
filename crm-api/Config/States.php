<?php

declare(strict_types=1);

namespace TGA\CRM\Config;

final class States {
    public const APPLICATION = [
        'draft', 
        'submitted', 
        'under_review',
        'offer_received', 
        'rejected', 
        'waitlisted', 
        'enrolled'
    ];

    public const STUDENT_PROFILE = [
        'registered', 
        'profile_complete', 
        'documents_draft',
        'documents_submitted', 
        'documents_verified',
        'application_in_progress', 
        'application_submitted',
        'offer_received', 
        'admitted', 
        'enrolled'
    ];
}
