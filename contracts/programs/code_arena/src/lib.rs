use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod code_arena {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        challenge_id: String,
        base_stake_amount: u64,
        duration_days: u16,
        is_solo: bool,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.challenge_pool;
        pool.authority = ctx.accounts.creator.key();
        pool.oracle = ctx.accounts.oracle.key(); // The backend specific wallet!
        pool.beneficiary = ctx.accounts.beneficiary.key(); // Used only if is_solo
        pool.challenge_id = challenge_id;
        pool.base_stake_amount = base_stake_amount;
        pool.duration_days = duration_days;
        pool.is_solo = is_solo;
        pool.total_survivors = 0;
        pool.total_participants = 0;
        pool.pool_bump = ctx.bumps.challenge_pool;
        Ok(())
    }

    pub fn join_challenge(ctx: Context<JoinChallenge>) -> Result<()> {
        let pool = &mut ctx.accounts.challenge_pool;
        let participant = &mut ctx.accounts.participant_record;

        // Transfer SOL from the user to the PDA vault
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: pool.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, pool.base_stake_amount)?;

        // Initialize Participant PDA
        participant.user = ctx.accounts.user.key();
        participant.challenge_pool = pool.key();
        participant.strike_count = 0;
        participant.has_claimed_payout = false;
        participant.bump = ctx.bumps.participant_record;

        pool.total_participants += 1;
        pool.total_survivors += 1;

        Ok(())
    }

    /// ONLY the Node.js Backend Wallet (Oracle) can call this.
    pub fn apply_penalty(ctx: Context<ApplyPenalty>) -> Result<()> {
        let pool = &mut ctx.accounts.challenge_pool;
        let participant = &mut ctx.accounts.participant_record;

        // Ensure the Oracle is the one signing this transaction
        require_keys_eq!(pool.oracle, ctx.accounts.oracle.key(), ErrorCode::UnauthorizedOracle);
        require!(participant.strike_count < 2, ErrorCode::AlreadyEliminated);

        participant.strike_count += 1;

        // Logic for Solo Mode immediate distributions
        if pool.is_solo {
            let penalty_amount = pool.base_stake_amount / 2; // 50%
            
            // Transfer 50% from the PDA vault back to the beneficiary directly!
            // We use PDA signer seeds since the PDA is sending SOL
            let seeds = &[
                b"challenge_pool", 
                pool.challenge_id.as_bytes(), 
                &[pool.pool_bump]
            ];
            let signer = &[&seeds[..]];

            // Transfer from PDA to Beneficiary (which could be treasury or a friend)
            **pool.to_account_info().try_borrow_mut_lamports()? -= penalty_amount;
            **ctx.accounts.beneficiary.to_account_info().try_borrow_mut_lamports()? += penalty_amount;
        } else {
            // For multiplayer, if they hit 2 strikes, they are completely eliminated
            if participant.strike_count == 2 {
                pool.total_survivors -= 1;
                // Their staked SOL just stays inside the PDA vault to be split by survivors later!
            }
        }

        Ok(())
    }

    pub fn claim_payout(ctx: Context<ClaimPayout>) -> Result<()> {
        let pool = &mut ctx.accounts.challenge_pool;
        let participant = &mut ctx.accounts.participant_record;

        require!(!participant.has_claimed_payout, ErrorCode::AlreadyClaimed);
        require!(participant.strike_count < 2, ErrorCode::Eliminated);

        let payout_amount: u64;

        if pool.is_solo {
            // If solo, they get back whatever wasn't penalized
            if participant.strike_count == 0 {
                payout_amount = pool.base_stake_amount; // 100%
            } else {
                payout_amount = pool.base_stake_amount / 2; // 50%
            }
        } else {
            // Multiplayer distribution: Share of the surviving pool
            require!(pool.total_survivors > 0, ErrorCode::NoSurvivors);
            
            // The vault balance. We subtract rent exemption minimum if needed, but for simplicity:
            let vault_balance = pool.to_account_info().lamports();
            payout_amount = vault_balance / pool.total_survivors;
            
            pool.total_survivors -= 1; // Decrement so math works for next claimer
        }

        participant.has_claimed_payout = true;

        // Transfer from PDA to User
        let seeds = &[
            b"challenge_pool", 
            pool.challenge_id.as_bytes(), 
            &[pool.pool_bump]
        ];
        let signer = &[&seeds[..]];

        **pool.to_account_info().try_borrow_mut_lamports()? -= payout_amount;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += payout_amount;

        Ok(())
    }
}

// ----------------------------------------------------
// Context Structs (Account Validation)
// ----------------------------------------------------

#[derive(Accounts)]
#[instruction(challenge_id: String)]
pub struct InitializePool<'info> {
    #[account(
        init, 
        payer = creator, 
        space = 8 + ChallengePool::SPACE,
        seeds = [b"challenge_pool", challenge_id.as_bytes()],
        bump
    )]
    pub challenge_pool: Account<'info, ChallengePool>,
    #[account(mut)]
    pub creator: Signer<'info>,
    /// CHECK: The public key of the Node.js backend
    pub oracle: UncheckedAccount<'info>, 
    /// CHECK: The address that receives penalties in Solo mode
    #[account(mut)]
    pub beneficiary: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinChallenge<'info> {
    #[account(mut)]
    pub challenge_pool: Account<'info, ChallengePool>,
    #[account(
        init,
        payer = user,
        space = 8 + ParticipantRecord::SPACE,
        seeds = [b"participant", challenge_pool.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub participant_record: Account<'info, ParticipantRecord>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApplyPenalty<'info> {
    #[account(mut)]
    pub challenge_pool: Account<'info, ChallengePool>,
    #[account(mut, has_one = challenge_pool)]
    pub participant_record: Account<'info, ParticipantRecord>,
    /// We guarantee the signer matches the oracle pubkey inside the program logic
    #[account(mut)]
    pub oracle: Signer<'info>, 
    /// CHECK: We must pass the pool's designated beneficiary to give them SOL
    #[account(mut, address = challenge_pool.beneficiary)]
    pub beneficiary: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ClaimPayout<'info> {
    #[account(mut)]
    pub challenge_pool: Account<'info, ChallengePool>,
    #[account(mut, has_one = challenge_pool, has_one = user)]
    pub participant_record: Account<'info, ParticipantRecord>,
    #[account(mut)]
    pub user: Signer<'info>,
}

// ----------------------------------------------------
// Data Structures
// ----------------------------------------------------

#[account]
pub struct ChallengePool {
    pub authority: Pubkey,
    pub oracle: Pubkey,
    pub beneficiary: Pubkey,
    pub challenge_id: String, // E.g., "challenge_123"
    pub base_stake_amount: u64,
    pub duration_days: u16,
    pub is_solo: bool,
    pub total_survivors: u64,
    pub total_participants: u64,
    pub pool_bump: u8,
}

impl ChallengePool {
    // 32 + 32 + 32 + (4 + 64) + 8 + 2 + 1 + 8 + 8 + 1 = 192 bytes
    pub const SPACE: usize = 192; 
}

#[account]
pub struct ParticipantRecord {
    pub user: Pubkey,
    pub challenge_pool: Pubkey,
    pub strike_count: u8,
    pub has_claimed_payout: bool,
    pub bump: u8,
}

impl ParticipantRecord {
    // 32 + 32 + 1 + 1 + 1 = 67 bytes
    pub const SPACE: usize = 67;
}

// ----------------------------------------------------
// Custom Errors
// ----------------------------------------------------

#[error_code]
pub enum ErrorCode {
    #[msg("Only the designated backend oracle can apply penalties.")]
    UnauthorizedOracle,
    #[msg("Participant has already been eliminated from the challenge.")]
    AlreadyEliminated,
    #[msg("You are eliminated and cannot claim a payout.")]
    Eliminated,
    #[msg("You have already claimed your payout.")]
    AlreadyClaimed,
    #[msg("There are no survivors left in the pool to divide the reward.")]
    NoSurvivors,
}
