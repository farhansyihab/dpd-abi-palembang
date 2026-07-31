// public/src/debug-tools.js
/**
 * debug-tools.js - Ekspos Repository & Service ke `window` untuk debugging di console browser.
 * 
 * KEAMANAN: File ini HANYA di-load oleh main.js jika hostname adalah 'localhost' atau '127.0.0.1'.
 * File ini TIDAK AKAN PERNAH di-load di production (Firebase Hosting), sehingga aman dari risiko
 * kebocoran akses data lewat browser console oleh pihak yang tidak berwenang.
 */

console.log('🔧 [DEBUG MODE] Memuat tools debugging ke window...');

// ==========================================
// 1. Repositories
// ==========================================
import('./repositories/FamilyRepository.js')
    .then(mod => {
        window.FamilyRepository = mod.FamilyRepository;
        window.familyRepo = new mod.FamilyRepository();
        console.log('✅ FamilyRepository dimuat');
    })
    .catch(err => console.error('❌ Gagal memuat FamilyRepository', err));

import('./repositories/PersonRepository.js')
    .then(mod => {
        window.PersonRepository = mod.PersonRepository;
        window.personRepo = new mod.PersonRepository();
        console.log('✅ PersonRepository dimuat');
    })
    .catch(err => console.error('❌ Gagal memuat PersonRepository', err));

import('./repositories/PersonRelationRepository.js')
    .then(mod => {
        window.PersonRelationRepository = mod.PersonRelationRepository;
        window.personRelationRepo = new mod.PersonRelationRepository();
        console.log('✅ PersonRelationRepository dimuat');
    })
    .catch(err => console.error('❌ Gagal memuat PersonRelationRepository', err));

import('./repositories/EconomicAssessmentRepository.js')
    .then(mod => {
        window.EconomicAssessmentRepository = mod.EconomicAssessmentRepository;
        window.economicAssessmentRepo = new mod.EconomicAssessmentRepository();
        console.log('✅ EconomicAssessmentRepository dimuat');
    })
    .catch(err => console.error('❌ Gagal memuat EconomicAssessmentRepository', err));

import('./repositories/ProgramRepository.js')
    .then(mod => {
        window.programRepo = new mod.ProgramRepository();
        console.log('✅ ProgramRepository dimuat');
    })
    .catch(err => console.error('❌ Gagal memuat ProgramRepository', err));

import('./repositories/ProgramParticipantRepository.js')
    .then(mod => {
        window.programParticipantRepo = new mod.ProgramParticipantRepository();
        console.log('✅ ProgramParticipantRepository dimuat');
    })
    .catch(err => console.error('❌ Gagal memuat ProgramParticipantRepository', err));

import('./repositories/StatusHistoryRepository.js')
    .then(mod => {
        window.statusHistoryRepo = new mod.StatusHistoryRepository();
        console.log('✅ StatusHistoryRepository dimuat');
    })
    .catch(err => console.error('❌ Gagal memuat StatusHistoryRepository', err));

import('./repositories/UserRepository.js')
    .then(mod => {
        window.userRepo = new mod.UserRepository();
        console.log('✅ UserRepository dimuat');
    })
    .catch(err => console.error('❌ Gagal memuat UserRepository', err));

// ==========================================
// 2. Services
// ==========================================
import('./services/Validator.js')
    .then(mod => {
        window.Validator = mod.Validator;
        console.log('✅ Validator dimuat');
    });

import('./services/FamilyService.js')
    .then(mod => {
        window.familyService = new mod.FamilyService();
        console.log('✅ FamilyService dimuat');
    });

import('./services/PersonService.js')
    .then(mod => {
        window.personService = new mod.PersonService();
        console.log('✅ PersonService dimuat');
    });

import('./services/SearchService.js')
    .then(mod => {
        window.searchService = new mod.SearchService();
        console.log('✅ SearchService dimuat');
    });

import('./services/ProgramService.js')
    .then(mod => {
        window.programService = new mod.ProgramService();
        console.log('✅ ProgramService dimuat');
    });

import('./controllers/FamilyFormController.js')
    .then(() => {
        console.log('✅ FamilyFormController dimuat');
    })
    .catch(err => console.error('❌ Gagal memuat FamilyFormController', err));

console.log('🔧 [DEBUG MODE] Semua tools debugging berhasil dimuat. Silakan cek object `window` di console.');