@800FA19C # JP
@802865F4 # JP A
@802A6710 # US
@8029E668 # PAL

bl code # jump over the list and store its address in LR

# list of level codes

code:
#if not random or timer
	lis r4, 0x817F
#endif

#if timer
	li r0, 0 # set up the timer
	stw r0, 0x010C(r4)
	li r0, 1
	stb r0, 0x0101(r4)
#endif

lbz r0, 0x12(r31)

#if not random
	cmpwi r0, 15 # if going to the title screen, reset the sequence counter and return
	bne- 0x10
	li r0, 0
	stw r0, 0(r4)
	b done
#endif

cmpwi r0, 1 # if not going to the plaza or airstrip, return
bgt- done

#if random
	mftbl r3 # load a pseudo-random even offset in the list into r3
	li r4, # length of the list in bytes
	divwu r0, r3, r4
	mullw r0, r0, r4
	sub r3, r3, r0
	rlwinm r3, r3, 0, 0, 30
#else
	lwz r3, 0(r4) # increment the sequence counter and keep it in r3
	addi r0, r3, 2
	stw r0, 0(r4)
#endif

mflr r4
lhzx r3, r4, r3
sth r3, 0x12(r31)
lwz r4, TFlagManager::smInstance #-0x6830(r13) on JP, -0x61A0(r13) on JP A, -0x6060(r13) on US, -0x6138(r13) on PAL
stb r3, 0xDF(r4)
lwz r3, 0x20(r31) # run replaced instruction