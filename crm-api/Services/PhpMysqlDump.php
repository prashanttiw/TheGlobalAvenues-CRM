<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use PDO;
use RuntimeException;

class PhpMysqlDump
{
    /**
     * Minimal PHP fallback to dump MySQL database and compress it via gzip.
     * @return string Returns the $outputPath on success
     */
    public static function dump(PDO $pdo, string $outputPath): string
    {
        $gz = gzopen($outputPath, 'w9');
        if (!$gz) {
            throw new RuntimeException("Could not open file for gzipped dump: {$outputPath}");
        }

        gzwrite($gz, "-- PHP Fallback MySQL Dump\n");
        gzwrite($gz, "-- Generated: " . date('Y-m-d H:i:s') . "\n\n");
        gzwrite($gz, "SET FOREIGN_KEY_CHECKS=0;\n\n");

        $tables = $pdo->query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")->fetchAll(PDO::FETCH_COLUMN);

        foreach ($tables as $table) {
            // Write table structure
            $createTableStmt = $pdo->query("SHOW CREATE TABLE `{$table}`")->fetch(PDO::FETCH_ASSOC);
            $createSql = isset($createTableStmt['Create Table']) ? $createTableStmt['Create Table'] : '';
            gzwrite($gz, "DROP TABLE IF EXISTS `{$table}`;\n");
            gzwrite($gz, "{$createSql};\n\n");

            // Write table data
            $pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, false);
            $rows = $pdo->query("SELECT * FROM `{$table}`");
            $rows->setFetchMode(PDO::FETCH_ASSOC);
            
            $rowCount = 0;
            $insertPrefix = "INSERT INTO `{$table}` VALUES ";
            $insertBuffer = [];
            
            foreach ($rows as $row) {
                $values = array_map(function ($val) use ($pdo) {
                    if ($val === null) {
                        return 'NULL';
                    }
                    return $pdo->quote((string)$val);
                }, array_values($row));
                
                $insertBuffer[] = '(' . implode(',', $values) . ')';
                $rowCount++;
                
                // Flush every 500 rows
                if ($rowCount % 500 === 0) {
                    gzwrite($gz, $insertPrefix . implode(',', $insertBuffer) . ";\n");
                    $insertBuffer = [];
                }
            }
            $pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, true);
            
            if (!empty($insertBuffer)) {
                gzwrite($gz, $insertPrefix . implode(',', $insertBuffer) . ";\n");
            }
            gzwrite($gz, "\n");
        }

        gzwrite($gz, "SET FOREIGN_KEY_CHECKS=1;\n");
        gzclose($gz);

        return $outputPath;
    }
}
