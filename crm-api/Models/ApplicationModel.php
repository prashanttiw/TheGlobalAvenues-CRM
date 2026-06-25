<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

class ApplicationModel extends BaseModel
{
    protected string $table = 'applications';
    protected bool $useSoftDeletes = true;

    private function generateReferenceNumber(): string
    {
        $year = date('Y');
        $stmt = $this->pdo->prepare("SELECT reference_number FROM {$this->table} WHERE reference_number LIKE ? ORDER BY id DESC LIMIT 1");
        $stmt->execute(["TGA-{$year}-%"]);
        $lastRef = $stmt->fetchColumn();

        if ($lastRef) {
            $parts = explode('-', $lastRef);
            $sequence = (int)end($parts) + 1;
        } else {
            $sequence = 1;
        }

        return sprintf("TGA-%s-%06d", $year, $sequence);
    }

    public function insertWithReference(array $data): int
    {
        $maxRetries = 3;
        for ($i = 0; $i < $maxRetries; $i++) {
            try {
                $data['reference_number'] = $this->generateReferenceNumber();
                return parent::insert($data);
            } catch (\PDOException $e) {
                if ($e->getCode() == '23000') {
                    if ($i === $maxRetries - 1) {
                        throw clone $e;
                    }
                    continue;
                }
                throw $e;
            }
        }
        throw new \RuntimeException('Failed to generate unique reference number.');
    }
}
